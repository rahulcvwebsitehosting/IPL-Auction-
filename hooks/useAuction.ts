
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuctionState, Player } from '../types';
import { INITIAL_PLAYER_POOL } from '../constants';

const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-socket-server.com';

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

export const useAuction = (roomId: string, userTeamId: string, userName: string) => {
  const [state, setState] = useState<AuctionState | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId || !userTeamId) return;

    // In a real environment, you'd point to your hosted backend
    // For local testing, we connect to localhost:3001
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.emit('join-room', { roomId, userTeamId, userName });

    socket.on('state-updated', (newState: AuctionState) => {
      setState(newState);
    });

    socket.on('timer-tick', (timer: number) => {
      setState(prev => prev ? { ...prev, timer } : null);
    });

    socket.on('play-sound', (type: string) => {
      playSound(type);
    });

    socket.on('error', (msg: string) => {
      alert(msg);
      window.location.reload();
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userTeamId, userName]);

  const placeBid = useCallback((teamId: string, amount: number) => {
    if (socketRef.current && state?.status === 'AUCTION') {
      socketRef.current.emit('place-bid', { roomId, teamId, amount });
    }
  }, [roomId, state?.status]);

  const startAuction = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('start-auction', roomId);
    }
  }, [roomId]);

  const togglePause = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('toggle-pause', roomId);
    }
  }, [roomId]);

  const setTimerDuration = useCallback((duration: number) => {
    // This could also be emitted to server if desired
    console.log("Setting timer duration to", duration);
  }, []);

  return {
    state,
    currentPlayer: state ? INITIAL_PLAYER_POOL[state.currentPlayerIndex] : null,
    placeBid,
    startAuction,
    togglePause,
    setTimerDuration
  };
};
