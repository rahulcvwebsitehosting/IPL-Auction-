import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuctionState, ChatMessage, TeamState, Player, ActivityLog } from '../types';
import { INITIAL_PLAYER_POOL, TEAMS } from '../constants.js';

const getSocketUrl = () => {
  const { hostname, protocol, host, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:3001`;
  if (host.includes('3000')) return origin.replace(/3000/g, '3001');
  const portRegex = /:(\d+)$/;
  if (portRegex.test(host)) return origin.replace(portRegex, ':3001');
  return `${protocol}//${hostname}:3001`;
};

const playSound = (type: string) => {
  const sounds: Record<string, string> = {
    bid: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    sold: 'https://assets.mixkit.co/active_storage/sfx/1017/1017-preview.mp3',
    timer: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    unsold: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'
  };
  if (sounds[type]) {
    const audio = new Audio(sounds[type]);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }
};

const createInitialLocalState = (roomId: string, hostId: string): AuctionState => {
  const teams: Record<string, TeamState> = {};
  TEAMS.forEach(t => {
    teams[t.id] = { id: t.id, purse: 12000, squad: [], overseasCount: 0, joinedBy: t.id === hostId ? 'You' : undefined };
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
};

export const useAuction = (roomId: string, userTeamId: string, userName: string) => {
  const [state, setState] = useState<AuctionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<number | null>(null);

  // --- Real Socket Connection Logic ---
  useEffect(() => {
    if (!roomId || !userTeamId || isDemoMode) return;

    const url = getSocketUrl();
    const socket = io(url, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
      withCredentials: true,
      path: '/socket.io/'
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setError(null);
      socket.emit('join-room', { roomId, userTeamId, userName });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Auction] Connection error, fallback available:', err.message);
      setError(`Backend server (port 3001) is unreachable. Would you like to play in Demo Mode instead?`);
    });

    socket.on('state-updated', (newState: AuctionState) => setState(newState));
    socket.on('chat-message', (msg: ChatMessage) => {
      setState(prev => prev ? { ...prev, messages: [...prev.messages, msg].slice(-100) } : null);
    });
    socket.on('timer-tick', (timer: number) => setState(prev => prev ? { ...prev, timer } : null));
    socket.on('play-sound', (type: string) => playSound(type));

    return () => {
      socket.disconnect();
    };
  }, [roomId, userTeamId, userName, isDemoMode]);

  // --- Demo Mode Simulation Engine ---
  const startDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setError(null);
    setState(createInitialLocalState(roomId || 'DEMO-123', userTeamId || 'CSK'));
  }, [roomId, userTeamId]);

  useEffect(() => {
    if (!isDemoMode || !state) return;

    if (state.status === 'AUCTION' && !state.isPaused) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (!prev || prev.status !== 'AUCTION' || prev.isPaused) return prev;
          
          // Random Bot Bidding Logic
          const shouldBotBid = Math.random() > 0.92 && prev.timer > 2;
          if (shouldBotBid) {
            const botTeams = TEAMS.filter(t => t.id !== userTeamId);
            const randomTeam = botTeams[Math.floor(Math.random() * botTeams.length)];
            const bidAmount = prev.currentBidder ? prev.currentBid + prev.minIncrement : prev.currentBid;
            
            // Only bid if bot has money and isn't current bidder
            if (prev.teams[randomTeam.id].purse >= bidAmount && prev.currentBidder !== randomTeam.id) {
              playSound('bid');
              return {
                ...prev,
                currentBid: bidAmount,
                currentBidder: randomTeam.id,
                timer: prev.timerDuration,
                activity: [{
                  id: Math.random().toString(36).substr(2, 9),
                  type: 'BID',
                  teamId: randomTeam.id,
                  amount: bidAmount,
                  timestamp: Date.now()
                }, ...prev.activity]
              };
            }
          }

          if (prev.timer > 0) {
            if (prev.timer === 5) playSound('timer');
            return { ...prev, timer: prev.timer - 1 };
          } else {
            // Round End Logic
            const player = INITIAL_PLAYER_POOL[prev.currentPlayerIndex];
            const updatedTeams = { ...prev.teams };
            let lastSoldInfo = null;

            if (prev.currentBidder) {
              const team = updatedTeams[prev.currentBidder];
              team.purse -= prev.currentBid;
              team.squad = [...team.squad, player];
              if (player.overseas) team.overseasCount += 1;
              lastSoldInfo = { playerName: player.name, teamId: prev.currentBidder, amount: prev.currentBid, status: 'SOLD' as const };
              playSound('sold');
            } else {
              lastSoldInfo = { playerName: player.name, teamId: null, amount: 0, status: 'UNSOLD' as const };
              playSound('unsold');
            }

            return {
              ...prev,
              status: 'ROUND_END',
              teams: updatedTeams,
              lastSoldInfo,
              activity: [{
                id: Math.random().toString(36).substr(2, 9),
                type: lastSoldInfo.status,
                playerName: player.name,
                teamId: lastSoldInfo.teamId || undefined,
                amount: lastSoldInfo.amount,
                timestamp: Date.now()
              }, ...prev.activity]
            };
          }
        });
      }, 1000);
    }

    if (state.status === 'ROUND_END') {
      setTimeout(() => {
        setState(prev => {
          if (!prev) return prev;
          const nextIndex = prev.currentPlayerIndex + 1;
          if (nextIndex >= INITIAL_PLAYER_POOL.length) {
            return { ...prev, status: 'RESULTS' };
          }
          const nextPlayer = INITIAL_PLAYER_POOL[nextIndex];
          return {
            ...prev,
            status: 'AUCTION',
            currentPlayerIndex: nextIndex,
            currentBid: nextPlayer.basePrice,
            currentBidder: null,
            timer: prev.timerDuration,
            lastSoldInfo: null
          };
        });
      }, 3000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDemoMode, state?.status, state?.isPaused, userTeamId]);

  // --- External Actions ---
  const placeBid = useCallback((teamId: string, amount: number) => {
    if (isDemoMode) {
      setState(prev => {
        if (!prev || prev.status !== 'AUCTION' || prev.isPaused) return prev;
        if (amount <= prev.currentBid && prev.currentBidder) return prev;
        if (prev.teams[teamId].purse < amount) return prev;
        playSound('bid');
        return {
          ...prev,
          currentBid: amount,
          currentBidder: teamId,
          timer: prev.timerDuration,
          activity: [{
            id: Math.random().toString(36).substr(2, 9),
            type: 'BID',
            teamId,
            amount,
            timestamp: Date.now()
          }, ...prev.activity]
        };
      });
    } else {
      socketRef.current?.emit('place-bid', { roomId, teamId, amount });
    }
  }, [isDemoMode, roomId]);

  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = { id: Math.random().toString(36).substr(2, 9), sender: userName, teamId: userTeamId, text, timestamp: Date.now() };
    if (isDemoMode) {
      setState(prev => prev ? { ...prev, messages: [...prev.messages, msg].slice(-100) } : null);
    } else {
      socketRef.current?.emit('send-message', { roomId, message: { sender: userName, teamId: userTeamId, text } });
    }
  }, [isDemoMode, roomId, userName, userTeamId]);

  const startAuction = useCallback(() => {
    if (isDemoMode) {
      setState(prev => prev ? { ...prev, status: 'AUCTION', timer: prev.timerDuration } : null);
    } else {
      socketRef.current?.emit('start-auction', roomId);
    }
  }, [isDemoMode, roomId]);

  const togglePause = useCallback(() => {
    if (isDemoMode) {
      setState(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
    } else {
      socketRef.current?.emit('toggle-pause', roomId);
    }
  }, [isDemoMode, roomId]);

  const updateSettings = useCallback((settings: any) => {
    if (isDemoMode) {
      setState(prev => prev ? { ...prev, ...settings } : null);
    } else {
      socketRef.current?.emit('update-settings', { roomId, settings: { ...settings, hostId: userTeamId } });
    }
  }, [isDemoMode, roomId, userTeamId]);

  return {
    state,
    error,
    isDemoMode,
    currentPlayer: state ? INITIAL_PLAYER_POOL[state.currentPlayerIndex] : null,
    placeBid,
    sendMessage,
    startAuction,
    togglePause,
    updateSettings,
    startDemoMode
  };
};