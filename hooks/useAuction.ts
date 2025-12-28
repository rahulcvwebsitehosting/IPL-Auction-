
import { useState, useEffect, useCallback, useRef } from 'react';
import { AuctionState, Player, TeamState, ActivityLog, TeamConfig } from '../types';
import { INITIAL_PLAYER_POOL, TEAMS } from '../constants';

const SYNC_CHANNEL = 'ipl_auction_realtime_v5';

// Helper for sound effects
const playSound = (type: 'bid' | 'sold' | 'timer' | 'unsold') => {
  const sounds = {
    bid: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    sold: 'https://assets.mixkit.co/active_storage/sfx/1017/1017-preview.mp3',
    timer: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    unsold: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.4;
  audio.play().catch(() => {}); 
};

export const useAuction = (roomId: string, userTeamId: string, userName: string) => {
  const [state, setState] = useState<AuctionState | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Initialize State
  useEffect(() => {
    if (!roomId) return;

    const initialTeams: Record<string, TeamState> = {};
    TEAMS.forEach(t => {
      initialTeams[t.id] = { id: t.id, purse: 12000, squad: [], overseasCount: 0 };
    });

    const defaultState: AuctionState = {
      roomId,
      hostId: userTeamId,
      status: 'LOBBY',
      mode: 'MEGA',
      currentPlayerIndex: 0,
      currentBid: INITIAL_PLAYER_POOL[0].basePrice,
      currentBidder: null,
      timer: 15,
      timerDuration: 15,
      isPaused: false,
      activity: [],
      teams: initialTeams,
      unsoldPlayers: [],
      lastSoldInfo: null
    };

    const saved = localStorage.getItem(`auction_${roomId}`);
    const finalInitial = saved ? JSON.parse(saved) : defaultState;
    
    // Auto-join current user's team if not already taken
    if (finalInitial.status === 'LOBBY' && userTeamId && !finalInitial.teams[userTeamId].joinedBy) {
      finalInitial.teams[userTeamId].joinedBy = userName;
    }

    setState(finalInitial);
    
    broadcastRef.current = new BroadcastChannel(`${SYNC_CHANNEL}_${roomId}`);
    broadcastRef.current.onmessage = (event) => {
      setState(event.data);
    };

    return () => {
      broadcastRef.current?.close();
    };
  }, [roomId, userTeamId, userName]);

  // Sync state helper that broadcasts and saves
  const syncState = useCallback((newState: AuctionState) => {
    setState(newState);
    localStorage.setItem(`auction_${newState.roomId}`, JSON.stringify(newState));
    broadcastRef.current?.postMessage(newState);
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!state || state.status !== 'AUCTION' || state.isPaused) return;

    const interval = setInterval(() => {
      let shouldTriggerEnd = false;
      let stateSnapshot: AuctionState | null = null;

      setState(prev => {
        if (!prev || prev.status !== 'AUCTION' || prev.isPaused) return prev;
        
        if (prev.timer <= 1) {
          shouldTriggerEnd = true;
          stateSnapshot = { ...prev, timer: 0 }; // Final snapshot for result calculation
          return stateSnapshot;
        }
        
        if (prev.timer === 6) playSound('timer');
        return { ...prev, timer: prev.timer - 1 };
      });

      // Execute round end logic outside of the functional state update to avoid side-effect nesting
      if (shouldTriggerEnd && stateSnapshot) {
        clearInterval(interval);
        handleRoundEnd(stateSnapshot);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state?.status, state?.isPaused, state?.currentPlayerIndex]);

  const handleRoundEnd = useCallback((currentState: AuctionState) => {
    const player = INITIAL_PLAYER_POOL[currentState.currentPlayerIndex];
    const newState = { ...currentState };
    
    // BYPASS LOGIC: Ensure that if any bid was placed (currentBidder is not null),
    // the player is marked as SOLD even if the timer expired.
    if (currentState.currentBidder !== null) {
      const winningTeam = newState.teams[currentState.currentBidder];
      winningTeam.purse -= currentState.currentBid;
      winningTeam.squad.push(player);
      if (player.overseas) winningTeam.overseasCount += 1;
      
      newState.lastSoldInfo = {
        playerName: player.name,
        teamId: currentState.currentBidder,
        amount: currentState.currentBid,
        status: 'SOLD'
      };
      
      newState.activity.unshift({
        id: Math.random().toString(),
        // Fix: Use const assertion to prevent type widening to string
        type: 'SOLD' as const,
        teamId: currentState.currentBidder,
        playerName: player.name,
        amount: currentState.currentBid,
        timestamp: Date.now()
      });
      playSound('sold');
    } else {
      // Truly UNSOLD: No bidder was assigned during the timer period
      newState.unsoldPlayers.push(player.id);
      newState.lastSoldInfo = {
        playerName: player.name,
        teamId: null,
        amount: 0,
        status: 'UNSOLD'
      };
      newState.activity.unshift({
        id: Math.random().toString(),
        // Fix: Use const assertion to prevent type widening to string
        type: 'UNSOLD' as const,
        playerName: player.name,
        timestamp: Date.now()
      });
      playSound('unsold');
    }

    newState.status = 'ROUND_END';
    syncState(newState);

    // Transition to the next player after a brief delay to show the status banner
    setTimeout(() => {
      setState(prev => {
        if (!prev) return prev;
        const nextState = { ...prev };
        nextState.status = 'AUCTION';
        nextState.currentPlayerIndex += 1;
        
        if (nextState.currentPlayerIndex >= INITIAL_PLAYER_POOL.length) {
          nextState.status = 'RESULTS';
        } else {
          const nextPlayer = INITIAL_PLAYER_POOL[nextState.currentPlayerIndex];
          nextState.currentBid = nextPlayer.basePrice;
          nextState.currentBidder = null;
          nextState.timer = nextState.timerDuration;
          nextState.lastSoldInfo = null;
        }
        
        syncState(nextState);
        return nextState;
      });
    }, 3000);
  }, [syncState]);

  const placeBid = useCallback((teamId: string, amount: number) => {
    setState(prev => {
      if (!prev || prev.status !== 'AUCTION') return prev;
      
      const player = INITIAL_PLAYER_POOL[prev.currentPlayerIndex];
      const team = prev.teams[teamId];

      // Bidding Validation
      const isFirstBid = !prev.currentBidder;
      if (isFirstBid) {
        if (amount < prev.currentBid) return prev;
      } else {
        if (amount <= prev.currentBid) return prev;
      }

      if (team.purse < amount) return prev;
      if (team.squad.length >= 25) return prev;
      if (player.overseas && team.overseasCount >= 8) return prev;

      const newState: AuctionState = {
        ...prev,
        currentBid: amount,
        currentBidder: teamId,
        // Reset timer with extension up to the base duration
        timer: Math.min(prev.timer + 10, prev.timerDuration),
        activity: [{
          id: Math.random().toString(),
          // Fix: Use const assertion to prevent type widening to string
          type: 'BID' as const,
          teamId,
          amount,
          timestamp: Date.now()
        }, ...prev.activity].slice(0, 50)
      };
      
      playSound('bid');
      broadcastRef.current?.postMessage(newState);
      localStorage.setItem(`auction_${newState.roomId}`, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const setTimerDuration = useCallback((duration: number) => {
    if (!state) return;
    syncState({ ...state, timerDuration: duration, timer: state.status === 'LOBBY' ? duration : state.timer });
  }, [state, syncState]);

  const startAuction = () => {
    if (!state) return;
    syncState({ ...state, status: 'AUCTION', timer: state.timerDuration });
  };

  const togglePause = () => {
    if (!state) return;
    syncState({ ...state, isPaused: !state.isPaused });
  };

  return {
    state,
    currentPlayer: state ? INITIAL_PLAYER_POOL[state.currentPlayerIndex] : null,
    placeBid,
    startAuction,
    togglePause,
    setTimerDuration
  };
};
