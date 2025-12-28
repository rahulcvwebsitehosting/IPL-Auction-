
import React from 'react';
import { Player, Role } from '../types';

interface PlayerCardProps {
  player: Player | null;
  currentBid: number;
  currentBidderName: string | null;
  timer: number;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, currentBid, currentBidderName, timer }) => {
  if (!player) {
    return (
      <div className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p>Waiting for next player...</p>
      </div>
    );
  }

  const roleColors = {
    [Role.BAT]: 'bg-blue-500',
    [Role.BOWL]: 'bg-red-500',
    [Role.AR]: 'bg-green-500',
    [Role.WK]: 'bg-yellow-500'
  };

  const timerColor = timer <= 5 ? 'text-red-500 animate-pulse' : 'text-white';

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
      <div className="h-2 bg-slate-700 w-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(timer / 15) * 100}%` }}
        ></div>
      </div>
      
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${roleColors[player.role]} text-white mb-2 inline-block`}>
              {player.role}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-1">{player.name}</h1>
            <div className="flex gap-4 mt-2 text-slate-400 font-medium">
              <span>{player.country}</span>
              <span>•</span>
              <span>{player.set}</span>
              {player.overseas && <span className="text-yellow-500">Overseas ✈️</span>}
            </div>
          </div>
          
          <div className="text-right">
             <div className="text-slate-400 text-xs font-bold uppercase mb-1">Base Price</div>
             <div className="text-2xl font-bold text-white">₹{player.basePrice / 100} Cr</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 rounded-xl p-6 border border-slate-700">
          <div className="flex flex-col">
            <span className="text-slate-400 text-sm font-medium uppercase mb-1">Current Bid</span>
            <span className="text-4xl font-black text-blue-400 bid-pulse">₹{currentBid / 100} Cr</span>
            <span className="text-slate-300 text-sm mt-1">
              by <span className="font-bold text-white">{currentBidderName || 'Base'}</span>
            </span>
          </div>

          <div className="flex flex-col items-center md:items-end justify-center">
             <span className="text-slate-400 text-sm font-medium uppercase mb-1">Time Left</span>
             <span className={`text-5xl font-black ${timerColor}`}>{timer}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
