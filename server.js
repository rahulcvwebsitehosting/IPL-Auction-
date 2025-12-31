import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { INITIAL_PLAYER_POOL, TEAMS } from './constants.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { createViteRuntime } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
}

// Simple health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', serverTime: new Date().toISOString() }));

// Enhanced CORS Middleware for Express routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const io = new Server(httpServer, {
  cors: {
    // Dynamically allow the origin of the request to fix CORS issues in cloud IDEs
    origin: (origin, callback) => {
      // For development, allow all origins specifically to fix credentials issue
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  // Start with polling to establish session stability in proxied environments
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000, 
  pingInterval: 25000,
  connectTimeout: 45000,
  allowUpgrades: true
});

const rooms = new Map();

function createInitialState(roomId, hostId) {
  const teams = {};
  TEAMS.forEach(t => {
    teams[t.id] = { id: t.id, purse: 12000, squad: [], overseasCount: 0, joinedBy: null };
  });

  return {
    roomId,
    hostId,
    status: 'LOBBY',
    mode: 'MEGA',
    currentPlayerIndex: 0,
    currentBid: INITIAL_PLAYER_POOL[0].basePrice,
    currentBidder: null,
    timer: 15,
    timerDuration: 15,
    minIncrement: 50,
    isPaused: false,
    activity: [],
    messages: [],
    teams,
    unsoldPlayers: [],
    lastSoldInfo: null
  };
}

io.on('connection', (socket) => {
  const transport = socket.conn.transport.name;
  console.log(`[Server] New connection: ${socket.id} (Transport: ${transport})`);

  socket.conn.on('upgrade', () => {
    console.log(`[Server] Connection ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });

  socket.on('join-room', ({ roomId, userTeamId, userName }) => {
    if (!roomId) return;
    console.log(`[Server] ${userName} is joining room: ${roomId}`);
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createInitialState(roomId, userTeamId));
    }

    const state = rooms.get(roomId);
    const team = state.teams[userTeamId];
    
    if (team) {
      team.joinedBy = userName;
    }
    
    io.to(roomId).emit('state-updated', state);
  });

  socket.on('send-message', ({ roomId, message }) => {
    const state = rooms.get(roomId);
    if (!state) return;

    const chatMsg = {
      id: Math.random().toString(36).substr(2, 9),
      sender: message.sender,
      teamId: message.teamId,
      text: message.text,
      timestamp: Date.now()
    };

    state.messages.push(chatMsg);
    if (state.messages.length > 100) state.messages.shift();
    
    io.to(roomId).emit('chat-message', chatMsg);
  });

  socket.on('update-settings', ({ roomId, settings }) => {
    const state = rooms.get(roomId);
    if (!state || state.hostId !== settings.hostId) return;

    if (settings.minIncrement !== undefined) state.minIncrement = settings.minIncrement;
    if (settings.timerDuration !== undefined) state.timerDuration = settings.timerDuration;

    io.to(roomId).emit('state-updated', state);
  });

  socket.on('start-auction', (roomId) => {
    const state = rooms.get(roomId);
    if (!state) return;

    state.status = 'AUCTION';
    state.timer = state.timerDuration;
    startTimer(roomId);
    io.to(roomId).emit('state-updated', state);
  });

  socket.on('place-bid', ({ roomId, teamId, amount }) => {
    const state = rooms.get(roomId);
    if (!state || state.status !== 'AUCTION' || state.isPaused) return;

    const player = INITIAL_PLAYER_POOL[state.currentPlayerIndex];
    const team = state.teams[teamId];

    if (!team || !player) return;

    const currentPrice = state.currentBid;
    const requiredMin = state.currentBidder ? currentPrice + state.minIncrement : currentPrice;
    
    if (amount < requiredMin) return;
    if (team.purse < amount) return;
    if (team.squad.length >= 25) return;
    if (player.overseas && team.overseasCount >= 8) return;
    if (state.currentBidder === teamId) return;

    state.currentBid = amount;
    state.currentBidder = teamId;
    state.timer = state.timerDuration;

    state.activity.unshift({
      id: Math.random().toString(36).substr(2, 9),
      type: 'BID',
      teamId,
      amount,
      timestamp: Date.now()
    });

    io.to(roomId).emit('state-updated', state);
    io.to(roomId).emit('play-sound', 'bid');
  });

  socket.on('toggle-pause', (roomId) => {
    const state = rooms.get(roomId);
    if (!state) return;
    state.isPaused = !state.isPaused;
    io.to(roomId).emit('state-updated', state);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Server] Socket ${socket.id} disconnected: ${reason}`);
  });
});

function startTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room || room._timerRef) return;

  room._timerRef = setInterval(() => {
    const state = rooms.get(roomId);
    if (!state) {
      clearInterval(room._timerRef);
      return;
    }

    if (state.status === 'AUCTION' && !state.isPaused) {
      if (state.timer > 0) {
        state.timer -= 1;
        if (state.timer === 5) io.to(roomId).emit('play-sound', 'timer');
        io.to(roomId).emit('timer-tick', state.timer);
      } else {
        handleRoundEnd(roomId);
      }
    }
  }, 1000);
}

function handleRoundEnd(roomId) {
  const state = rooms.get(roomId);
  if (!state) return;

  const player = INITIAL_PLAYER_POOL[state.currentPlayerIndex];
  
  if (state.currentBidder) {
    const winningTeam = state.teams[state.currentBidder];
    winningTeam.purse -= state.currentBid;
    winningTeam.squad.push(player);
    if (player.overseas) winningTeam.overseasCount += 1;
    
    state.lastSoldInfo = {
      playerName: player.name,
      teamId: state.currentBidder,
      amount: state.currentBid,
      status: 'SOLD'
    };
    
    state.activity.unshift({
      id: Math.random().toString(36).substr(2, 9),
      type: 'SOLD',
      teamId: state.currentBidder,
      playerName: player.name,
      amount: state.currentBid,
      timestamp: Date.now()
    });
    io.to(roomId).emit('play-sound', 'sold');
  } else {
    state.unsoldPlayers.push(player.id);
    state.lastSoldInfo = {
      playerName: player.name,
      teamId: null,
      amount: 0,
      status: 'UNSOLD'
    };
    state.activity.unshift({
      id: Math.random().toString(36).substr(2, 9),
      type: 'UNSOLD',
      playerName: player.name,
      timestamp: Date.now()
    });
    io.to(roomId).emit('play-sound', 'unsold');
  }

  state.status = 'ROUND_END';
  io.to(roomId).emit('state-updated', state);

  setTimeout(() => {
    moveToNextPlayer(roomId);
  }, 3500);
}

function moveToNextPlayer(roomId) {
  const state = rooms.get(roomId);
  if (!state) return;

  state.currentPlayerIndex += 1;
  state.lastSoldInfo = null;
  
  if (state.currentPlayerIndex >= INITIAL_PLAYER_POOL.length) {
    state.status = 'RESULTS';
    if (state._timerRef) {
      clearInterval(state._timerRef);
      state._timerRef = null;
    }
  } else {
    const nextPlayer = INITIAL_PLAYER_POOL[state.currentPlayerIndex];
    state.status = 'AUCTION';
    state.currentBid = nextPlayer.basePrice;
    state.currentBidder = null;
    state.timer = state.timerDuration;
  }
  io.to(roomId).emit('state-updated', state);
}

const PORT = process.env.PORT || 3001;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteDevMiddleware = (
      await vite.createServer({
        server: { middlewareMode: true },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  } else {
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Auction Backend running on port ${PORT}`);
  });
}

startServer();