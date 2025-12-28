export enum Role {
  BAT = 'BATTER',
  BOWL = 'BOWLER',
  AR = 'ALL-ROUNDER',
  WK = 'WICKET-KEEPER'
}

export interface Player {
  id: number;
  name: string;
  country: string;
  role: Role;
  basePrice: number; // In Lakhs
  set: string;
  overseas: boolean;
}

export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  logo: string;
}

export interface TeamState {
  id: string;
  purse: number; // In Lakhs
  squad: Player[];
  overseasCount: number;
  joinedBy?: string; // Player name
}

export interface ActivityLog {
  id: string;
  type: 'BID' | 'SOLD' | 'UNSOLD' | 'JOIN';
  teamId?: string;
  playerName?: string;
  amount?: number;
  timestamp: number;
  message?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  teamId: string;
  text: string;
  timestamp: number;
}

export interface AuctionState {
  roomId: string;
  hostId: string; // TeamId of the creator
  status: 'LOBBY' | 'AUCTION' | 'ROUND_END' | 'RESULTS';
  mode: 'MEGA' | 'MOCK';
  currentPlayerIndex: number;
  currentBid: number;
  currentBidder: string | null;
  timer: number;
  timerDuration: number;
  isPaused: boolean;
  activity: ActivityLog[];
  messages: ChatMessage[];
  teams: Record<string, TeamState>;
  unsoldPlayers: number[]; // Player IDs
  lastSoldInfo: {
    playerName: string;
    teamId: string | null;
    amount: number;
    status: 'SOLD' | 'UNSOLD';
  } | null;
}