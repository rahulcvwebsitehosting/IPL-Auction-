import React, { useState, useEffect, useRef } from 'react';
import { TEAMS, INITIAL_PLAYER_POOL } from './constants.js';
import { Role, TeamConfig, Player, TeamState, ChatMessage } from './types';
import { useAuction } from './hooks/useAuction';
import Button from './components/Button';
import { 
  Users, 
  Settings as SettingsIcon, 
  History, 
  Layout, 
  Pause, 
  Play, 
  LogOut, 
  ChevronRight,
  Award,
  Globe,
  Trophy,
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  List,
  X,
  Zap
} from 'lucide-react';

// ----------------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------------

const TeamLogo: React.FC<{ team: TeamConfig | undefined; className?: string }> = ({ team, className = "w-8 h-8" }) => {
  const [error, setError] = useState(false);
  if (!team) return null;
  if (error) return (
    <div className={`${className} bg-slate-800 flex items-center justify-center rounded-full text-[10px] font-black text-white border border-white/10`}>
      {team.shortName}
    </div>
  );
  return (
    <img 
      src={team.logo} 
      className={`${className} rounded-full bg-white p-1 shadow-sm object-contain`} 
      alt={team.shortName} 
      onError={() => setError(true)}
    />
  );
};

const PlayerListModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Auction Pool</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INITIAL_PLAYER_POOL.map(p => (
              <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{p.role} • {p.country}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-blue-400">₹{(p.basePrice/100).toFixed(2)}Cr</div>
                  <div className="text-[8px] font-black text-slate-600 uppercase">{p.set}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBanner: React.FC<{ info: any }> = ({ info }) => {
  if (!info) return null;
  const isSold = info.status === 'SOLD';
  const team = isSold ? TEAMS.find(t => t.id === info.teamId) : null;

  return (
    <div className={`absolute inset-0 z-[60] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 ${isSold ? 'bg-green-600/95' : 'bg-red-600/95'}`}>
      <h2 className="text-6xl font-black text-white italic tracking-tighter mb-2">{info.status}!</h2>
      <div className="text-2xl font-bold text-white mb-4">
        {isSold ? `₹${(info.amount / 100).toFixed(2)} Cr` : 'No bids received'}
      </div>
      {isSold && team && (
        <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full border border-white/30">
          <TeamLogo team={team} className="w-8 h-8" />
          <span className="font-black text-white uppercase">{team.name}</span>
        </div>
      )}
      {!isSold && <div className="text-white/80 font-medium text-xl uppercase font-black">Unsold</div>}
    </div>
  );
};

const LoadingScreen: React.FC<{ roomId: string; error: string | null; onRetry: () => void; onStartDemo: () => void }> = ({ roomId, error, onRetry, onStartDemo }) => (
  <div className="min-h-screen ipl-gradient flex flex-col items-center justify-center p-6 text-center">
    <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
      {error ? (
        <>
          <div className="bg-red-500/10 text-red-500 p-6 rounded-3xl border border-red-500/20 mb-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm font-bold leading-relaxed">{error}</p>
          </div>
          <div className="space-y-3">
            <Button onClick={onStartDemo} variant="primary" className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2">
              <Zap size={18} /> START DEMO MODE
            </Button>
            <Button onClick={onRetry} variant="secondary" className="w-full py-4 rounded-2xl font-bold opacity-60 hover:opacity-100">RETRY CONNECTION</Button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white italic mb-2">JOINING ROOM</h2>
          <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 inline-block font-black text-blue-400 mb-6">{roomId}</div>
          <p className="text-slate-400 text-sm font-medium">Establishing secure connection to auction server...</p>
        </>
      )}
      <button onClick={() => window.location.reload()} className="mt-8 text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">CANCEL</button>
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// Main Application
// ----------------------------------------------------------------------------

const App: React.FC = () => {
  const [view, setView] = useState<'HOME' | 'GAME'>('HOME');
  const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'CHAT' | 'SQUAD' | 'SETTINGS'>('ACTIVITY');
  const [roomId, setRoomId] = useState('');
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [name, setName] = useState('');
  const [customBid, setCustomBid] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { state, error, isDemoMode, currentPlayer, placeBid, sendMessage, startAuction, togglePause, updateSettings, startDemoMode } = useAuction(
    view === 'GAME' ? roomId : '', 
    view === 'GAME' ? userTeamId : '', 
    name
  );

  useEffect(() => {
    if (activeTab === 'CHAT' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state?.messages, activeTab]);

  const handleJoinOrCreate = (code?: string) => {
    if (!name || !userTeamId) return alert('Enter name and select team!');
    const finalRoomId = code || Math.random().toString(36).substring(7).toUpperCase();
    setRoomId(finalRoomId);
    setView('GAME');
  };

  const handleCustomBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInLakhs = Math.round(parseFloat(customBid) * 100);
    if (!state || isNaN(amountInLakhs) || (state.currentBidder && amountInLakhs <= state.currentBid)) {
      alert("Invalid bid amount. Must be greater than current bid.");
      return;
    }
    placeBid(userTeamId, amountInLakhs);
    setCustomBid('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  if (view === 'HOME') {
    return (
      <div className="min-h-screen ipl-gradient flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-white italic tracking-tighter mb-3">PLAY AUCTION</h1>
            <p className="text-slate-400 font-medium text-lg">Real-time IPL 2026 Simulator</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="block text-slate-500 text-xs font-black uppercase tracking-widest">Your Profile</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="Manager Name" />
              <div className="grid grid-cols-5 gap-3">
                {TEAMS.map(team => (
                  <button key={team.id} onClick={() => setUserTeamId(team.id)} className={`aspect-square p-2 rounded-2xl transition-all border-2 flex items-center justify-center relative group ${userTeamId === team.id ? 'border-white bg-white/20 ring-4 ring-white/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`} style={userTeamId === team.id ? { borderColor: team.color, backgroundColor: `${team.color}33` } : {}}>
                    <TeamLogo team={team} className="w-10 h-10" />
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 flex flex-col gap-4">
              <Button onClick={() => handleJoinOrCreate()} className="w-full py-5 text-xl rounded-2xl font-black italic tracking-tight" style={userTeamId ? { backgroundColor: TEAMS.find(t => t.id === userTeamId)?.color, color: 'white' } : {}}>CREATE ROOM</Button>
              <div className="relative flex items-center">
                 <div className="flex-grow border-t border-slate-800"></div>
                 <span className="mx-4 text-slate-600 text-xs font-black uppercase tracking-widest">OR JOIN WITH CODE</span>
                 <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <div className="flex gap-3">
                <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 text-white font-black uppercase focus:border-blue-500 outline-none" placeholder="CODE" />
                <Button variant="secondary" onClick={() => handleJoinOrCreate(roomId)} className="px-8 rounded-2xl">JOIN</Button>
              </div>
              <button onClick={() => setIsPoolModalOpen(true)} className="text-slate-500 flex items-center gap-2 justify-center hover:text-white transition-colors py-2 text-xs font-black uppercase tracking-widest"><List size={14} /> VIEW PLAYER POOL</button>
            </div>
          </div>
        </div>
        <PlayerListModal isOpen={isPoolModalOpen} onClose={() => setIsPoolModalOpen(false)} />
      </div>
    );
  }

  if (!state) return <LoadingScreen roomId={roomId} error={error} onRetry={() => window.location.reload()} onStartDemo={startDemoMode} />;

  const myTeam = state.teams[userTeamId];
  const userTeamConfig = TEAMS.find(t => t.id === userTeamId);
  const nextPlayer = INITIAL_PLAYER_POOL[state.currentPlayerIndex + 1];
  const currentBidderConfig = state.currentBidder ? TEAMS.find(t => t.id === state.currentBidder) : null;

  const teamPrimaryColor = userTeamConfig?.color || '#3b82f6';

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col overflow-hidden font-sans">
      <PlayerListModal isOpen={isPoolModalOpen} onClose={() => setIsPoolModalOpen(false)} />
      <nav className="h-16 border-b border-white/5 bg-[#161920]/80 backdrop-blur-md px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 pr-4 border-r border-white/10">
             <TeamLogo team={userTeamConfig} className="w-8 h-8" />
             <span className="font-black italic tracking-tighter text-lg uppercase">{userTeamConfig?.shortName}</span>
           </div>
           {isDemoMode && (
             <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
               <Zap size={10} /> Demo Mode
             </div>
           )}
           <div className="flex items-center gap-2">
             <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Room</span>
             <div className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-md font-black text-sm border border-blue-500/20">{state.roomId}</div>
           </div>
           <div className="flex items-center gap-2 text-slate-400">
             <Users size={16} />
             <span className="text-xs font-bold">{Object.values(state.teams).filter((t: any) => t.joinedBy).length} / 10</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => setIsPoolModalOpen(true)} className="p-2 hover:bg-white/10 rounded-full text-slate-400"><List size={20} /></button>
           {(state.status === 'AUCTION' || state.status === 'LOBBY') && (
             <button onClick={togglePause} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
               {state.isPaused ? <Play size={20} /> : <Pause size={20} />}
             </button>
           )}
           <Button variant="danger" className="text-xs h-9 px-4 rounded-full" onClick={() => window.location.reload()}><LogOut size={14} /> LEAVE</Button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        <div className="flex-1 flex flex-col p-4 lg:p-6 gap-6 overflow-y-auto custom-scrollbar">
          {state.status === 'LOBBY' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 text-center">
               <Trophy className="text-yellow-500 w-20 h-20" />
               <div className="space-y-2">
                 <h2 className="text-4xl font-black italic uppercase">Awaiting Managers</h2>
                 <p className="text-slate-500 text-sm font-medium">Managers are joining your auction room...</p>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl">
                 {TEAMS.map(t => {
                   const teamState = state.teams[t.id];
                   const isJoined = !!teamState.joinedBy;
                   return (
                     <div key={t.id} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 shadow-lg ${isJoined ? 'bg-white/5 border-white/20' : 'opacity-20 border-transparent grayscale'}`}>
                        <TeamLogo team={t} className="w-16 h-16" />
                        <div className="text-sm font-bold truncate max-w-[120px]">{teamState.joinedBy || 'EMPTY'}</div>
                     </div>
                   );
                 })}
               </div>
               {state.hostId === userTeamId && <Button onClick={startAuction} className="px-12 py-5 text-2xl font-black italic rounded-3xl h-auto shadow-2xl">START AUCTION</Button>}
            </div>
          ) : (
            <>
              <div className={`relative bg-[#1a1e26] rounded-[2.5rem] border-4 overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[450px] transition-colors duration-500`} style={{ borderColor: currentBidderConfig ? currentBidderConfig.color : 'rgba(255,255,255,0.05)' }}>
                 <StatusBanner info={state.lastSoldInfo} />
                 <div className="lg:w-2/5 p-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-r border-white/5">
                    <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-400 mb-4 border border-white/5"><Globe size={10} /> {currentPlayer?.country}</div>
                    <h3 className="text-5xl font-black italic text-white uppercase tracking-tighter text-center">{currentPlayer?.name}</h3>
                    <div className="text-blue-400 font-bold uppercase text-lg mt-4 tracking-widest">{currentPlayer?.role}</div>
                 </div>
                 <div className="flex-1 p-10 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                       <div>
                         <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Base Price</span>
                         <span className="text-3xl font-black text-white">₹{currentPlayer ? (currentPlayer.basePrice / 100).toFixed(2) : 0} Cr</span>
                       </div>
                       <div className={`text-7xl font-black italic ${state.timer <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>{state.timer}s</div>
                    </div>
                    <div className="my-6 p-6 bg-black/20 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center shadow-inner">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Current Bid</span>
                       <div className="text-7xl font-black text-green-400 bid-pulse tracking-tighter">₹{(state.currentBid / 100).toFixed(2)} Cr</div>
                       <div className="mt-4 flex items-center gap-2 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                         {state.currentBidder ? <><TeamLogo team={currentBidderConfig} className="w-5 h-5" /><span className="text-xs font-bold text-slate-300 uppercase">Held by {currentBidderConfig?.name}</span></> : <span className="text-xs font-bold text-slate-500 uppercase italic">Awaiting first bid</span>}
                       </div>
                    </div>
                    {state.status === 'AUCTION' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                          {[state.minIncrement, state.minIncrement * 2, state.minIncrement * 4, state.minIncrement * 10].map(inc => {
                            const amount = (state.currentBidder || state.currentBid > currentPlayer?.basePrice!) ? state.currentBid + inc : state.currentBid;
                            const isDisabled = state.isPaused || myTeam.purse < amount || state.currentBidder === userTeamId;
                            return (
                              <button key={inc} onClick={() => placeBid(userTeamId, amount)} disabled={isDisabled} className={`py-4 rounded-2xl border border-white/10 font-black text-lg transition-all active:scale-95 ${isDisabled ? 'bg-slate-900 text-slate-700' : 'bg-blue-600 hover:brightness-110 shadow-lg text-white'}`} style={!isDisabled ? { backgroundColor: teamPrimaryColor } : {}}>+{inc}L</button>
                            );
                          })}
                        </div>
                        <form onSubmit={handleCustomBid} className="flex gap-2">
                           <input type="number" step="0.01" value={customBid} onChange={(e) => setCustomBid(e.target.value)} placeholder="Custom (Cr)" className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none" />
                           <button type="submit" disabled={state.isPaused || state.currentBidder === userTeamId} className="px-8 bg-blue-600 rounded-2xl font-black text-white disabled:bg-slate-800 disabled:text-slate-600">BID</button>
                        </form>
                      </div>
                    )}
                 </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg flex justify-between items-center"><div><h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">My Budget</h4><div className="text-3xl font-black text-white">₹{(myTeam.purse / 100).toFixed(2)} Cr</div></div><Award className="text-yellow-500" /></div>
                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg flex justify-between items-center"><div><h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Squad Size</h4><div className="text-3xl font-black text-white">{myTeam.squad.length} / 25</div></div><Layout className="text-blue-500" /></div>
                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg flex justify-between items-center"><div><h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Next Up</h4>{nextPlayer ? <div className="font-bold text-white text-lg">{nextPlayer.name}</div> : <div className="text-slate-600 italic">Pool Finished</div>}</div><ChevronRight className="text-slate-500" /></div>
              </div>
            </>
          )}
        </div>

        <div className="w-full lg:w-96 shrink-0 bg-[#161920] border-l border-white/5 flex flex-col h-full shadow-2xl">
           <div className="flex border-b border-white/5 p-2">
              {[
                { id: 'ACTIVITY', icon: History, label: 'Activity' },
                { id: 'CHAT', icon: MessageCircle, label: 'Chat' },
                { id: 'SQUAD', icon: Award, label: 'Squad' },
                { id: 'SETTINGS', icon: SettingsIcon, label: 'Info' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center gap-1 py-4 px-1 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><tab.icon size={20} /><span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span></button>
              ))}
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {activeTab === 'ACTIVITY' && (
                <div className="space-y-4">
                   {state.activity.map(log => (
                     <div key={log.id} className="animate-in slide-in-from-right-2 duration-300">
                       {log.type === 'BID' && (
                         <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2"><TeamLogo team={TEAMS.find(t => t.id === log.teamId)} className="w-6 h-6" /><span className="text-xs font-black uppercase text-slate-300">{TEAMS.find(t => t.id === log.teamId)?.shortName}</span></div>
                            <span className="text-sm font-black text-green-400">₹{(log.amount! / 100).toFixed(2)} Cr</span>
                         </div>
                       )}
                       {(log.type === 'SOLD' || log.type === 'UNSOLD') && <div className={`p-4 rounded-2xl border ${log.type === 'SOLD' ? 'bg-green-600/10 border-green-600/20' : 'bg-red-600/10 border-red-600/20'}`}><div className="text-[10px] font-black uppercase mb-1">{log.type}</div><div className="text-sm font-black uppercase">{log.playerName}</div></div>}
                     </div>
                   ))}
                </div>
              )}
              {activeTab === 'CHAT' && (
                <div className="flex flex-col h-full relative">
                   <div className="flex-1 space-y-4 pb-20">
                      {state.messages.length === 0 ? <div className="text-center py-20 text-slate-700 font-bold italic">Start the conversation...</div> : state.messages.map((msg) => {
                          const isMe = msg.teamId === userTeamId;
                          const team = TEAMS.find(t => t.id === msg.teamId);
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                               <div className="flex items-center gap-2 mb-1">{!isMe && <TeamLogo team={team} className="w-4 h-4" />}<span className="text-[10px] font-black text-slate-500 uppercase">{msg.sender} ({team?.shortName})</span></div>
                               <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>{msg.text}</div>
                            </div>
                          );
                      })}
                      <div ref={chatEndRef} />
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 bg-[#161920] pt-4"><form onSubmit={handleSendChat} className="flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none" /><button type="submit" className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors"><Send size={18} /></button></form></div>
                </div>
              )}
              {activeTab === 'SQUAD' && <div className="space-y-6">{TEAMS.map(team => {
                    const ts = state.teams[team.id];
                    if (ts.squad.length === 0) return null;
                    return (
                      <div key={team.id} className="rounded-3xl p-5 border bg-white/5 border-white/5">
                         <div className="flex items-center gap-3 mb-2"><TeamLogo team={team} className="w-6 h-6" /><span className="text-sm font-black uppercase text-slate-300">{team.name}</span></div>
                         <div className="flex flex-wrap gap-1.5 mt-2">{ts.squad.map((p, i) => (<div key={i} className="px-2 py-1 bg-black/40 rounded-lg text-[10px] font-bold text-slate-400">{p.name}</div>))}</div>
                      </div>
                    );
                  })}</div>}
              {activeTab === 'SETTINGS' && (
                <div className="space-y-6">
                   <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Room Information</div>
                      <div className="space-y-3">
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Room Code</span><span className="font-black text-blue-500">{state.roomId}</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Current Player</span><span className="font-black text-white">{state.currentPlayerIndex + 1} / {INITIAL_PLAYER_POOL.length}</span></div>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Min Increment</span><span className="font-black text-green-400">₹{state.minIncrement}L</span></div>
                      </div>
                   </div>
                   {state.hostId === userTeamId && (
                     <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Host Controls</div>
                        <div className="space-y-4">
                           <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Min Bid Increment</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {[10, 25, 50, 100].map(val => (
                                   <button key={val} onClick={() => updateSettings({ minIncrement: val })} className={`py-2 rounded-xl text-xs font-black transition-all ${state.minIncrement === val ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>{val}L</button>
                                 ))}
                              </div>
                           </div>
                           <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Timer Duration</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {[10, 15, 20, 30].map(val => (
                                   <button key={val} onClick={() => updateSettings({ timerDuration: val })} className={`py-2 rounded-xl text-xs font-black transition-all ${state.timerDuration === val ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>{val}s</button>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;