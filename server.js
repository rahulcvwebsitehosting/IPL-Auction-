
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { INITIAL_PLAYER_POOL, TEAMS } from './constants.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
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
    isPaused: false,
    activity: [],
    teams,
    unsoldPlayers: [],
    lastSoldInfo: null
  };
}

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userTeamId, userName }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createInitialState(roomId, userTeamId));
    }

    const state = rooms.get(roomId);
    
    // Check if team is already taken by someone else
    const team = state.teams[userTeamId];
    if (team.joinedBy && team.joinedBy !== userName) {
      socket.emit('error', 'Team already taken by another manager');
      return;
    }

    team.joinedBy = userName;
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

    // Validation
    const minBid = state.currentBidder ? state.currentBid + 1 : state.currentBid;
    if (amount < minBid) return;
    if (team.purse < amount) return;
    if (team.squad.length >= 25) return;
    if (player.overseas && team.overseasCount >= 8) return;
    if (state.currentBidder === teamId) return; // Cannot outbid self

    // Update state
    state.currentBid = amount;
    state.currentBidder = teamId;
    state.timer = state.timerDuration; // Reset timer on every valid bid

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
});

function startTimer(roomId) {
  const interval = setInterval(() => {
    const state = rooms.get(roomId);
    if (!state) return clearInterval(interval);

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
  }, 3000);
}

function moveToNextPlayer(roomId) {
  const state = rooms.get(roomId);
  if (!state) return;

  state.currentPlayerIndex += 1;
  if (state.currentPlayerIndex >= INITIAL_PLAYER_POOL.length) {
    state.status = 'RESULTS';
  } else {
    const nextPlayer = INITIAL_PLAYER_POOL[state.currentPlayerIndex];
    state.status = 'AUCTION';
    state.currentBid = nextPlayer.basePrice;
    state.currentBidder = null;
    state.timer = state.timerDuration;
    state.lastSoldInfo = null;
  }
  io.to(roomId).emit('state-updated', state);
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Auction Server running on port ${PORT}`);
});
