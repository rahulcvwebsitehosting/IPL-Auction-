import React, { useState, useEffect, useRef } from 'react';
import { TEAMS, INITIAL_PLAYER_POOL } from './constants';
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
  Share2,
  Trophy,
  MessageCircle,
  Send
} from 'lucide-react';

// ----------------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------------

const StatusBanner: React.FC<{ info: any }> = ({ info }) => {
  if (!info) return null;
  const isSold = info.status === 'SOLD';
  const team = isSold ? TEAMS.find(t => t.id === info.teamId) : null;

  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 ${isSold ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
      <h2 className="text-6xl font-black text-white italic tracking-tighter mb-2">{info.status}!</h2>
      <div className="text-2xl font-bold text-white mb-4">
        {isSold ? `₹${(info.amount / 100).toFixed(2)} Cr` : 'No bids received'}
      </div>
      {isSold && team && (
        <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full border border-white/30">
          <img src={team.logo} className="w-8 h-8 rounded-full bg-white p-0.5" alt={team.shortName} />
          <span className="font-black text-white uppercase">{team.name}</span>
        </div>
      )}
      {!isSold && (
        <div className="text-white/80 font-medium text-xl uppercase font-black">Unsold</div>
      )}
    </div>
  );
};

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
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { state, currentPlayer, placeBid, sendMessage, startAuction, togglePause, setTimerDuration } = useAuction(roomId, userTeamId, name);

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

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Join my IPL Auction Room! Code: ${state?.roomId}\nLink: ${window.location.origin}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCustomBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInLakhs = Math.round(parseFloat(customBid) * 100);
    if (!state || isNaN(amountInLakhs) || amountInLakhs <= state.currentBid) {
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
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="Manager Name"
              />
              
              <div className="grid grid-cols-5 gap-3">
                {TEAMS.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setUserTeamId(team.id)}
                    className={`aspect-square p-2 rounded-2xl transition-all border-2 flex items-center justify-center relative group
                      ${userTeamId === team.id ? 'border-white bg-white/20 ring-4 ring-white/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                    style={userTeamId === team.id ? { borderColor: team.color, backgroundColor: `${team.color}33` } : {}}
                  >
                    <img src={team.logo} alt={team.shortName} className="w-10 h-10 object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-4">
              <Button 
                onClick={() => handleJoinOrCreate()} 
                className="w-full py-5 text-xl rounded-2xl font-black italic tracking-tight"
                style={userTeamId ? { backgroundColor: TEAMS.find(t => t.id === userTeamId)?.color, color: getContrastColor(TEAMS.find(t => t.id === userTeamId)?.color || '#000000') === 'text-white' ? 'white' : 'black' } : {}}
              >
                CREATE ROOM
              </Button>
              <div className="relative flex items-center">
                 <div className="flex-grow border-t border-slate-800"></div>
                 <span className="mx-4 text-slate-600 text-xs font-black uppercase tracking-widest">OR JOIN WITH CODE</span>
                 <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 text-white font-black uppercase focus:border-blue-500 outline-none"
                  placeholder="CODE"
                />
                <Button variant="secondary" onClick={() => handleJoinOrCreate(roomId)} className="px-8 rounded-2xl">JOIN</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const myTeam = state.teams[userTeamId];
  const userTeamConfig = TEAMS.find(t => t.id === userTeamId);
  const nextPlayer = INITIAL_PLAYER_POOL[state.currentPlayerIndex + 1];
  const currentBidderConfig = state.currentBidder ? TEAMS.find(t => t.id === state.currentBidder) : null;

  function getContrastColor(hex: string) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'text-slate-900' : 'text-white';
  }

  const teamPrimaryColor = userTeamConfig?.color || '#3b82f6';
  const teamContrastClass = getContrastColor(teamPrimaryColor);

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Top Navbar */}
      <nav className="h-16 border-b border-white/5 bg-[#161920]/80 backdrop-blur-md px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 pr-4 border-r border-white/10">
             {userTeamConfig && (
               <>
                <img src={userTeamConfig.logo} className="w-8 h-8 rounded-full bg-white p-1 shadow-sm" alt={userTeamConfig.shortName} />
                <span className="font-black italic tracking-tighter text-lg uppercase">{userTeamConfig.shortName}</span>
               </>
             )}
           </div>
           <div className="flex items-center gap-2">
             <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Room</span>
             <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-md font-black text-sm border border-yellow-500/20">{state.roomId}</div>
           </div>
           <div className="flex items-center gap-2 text-slate-400">
             <Users size={16} />
             <span className="text-xs font-bold">{Object.values(state.teams).filter((t: any) => t.joinedBy).length} / 10</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
           {state.status === 'AUCTION' && (
             <button onClick={togglePause} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
               {state.isPaused ? <Play size={20} /> : <Pause size={20} />}
             </button>
           )}
           <Button variant="danger" className="text-xs h-9 px-4 rounded-full" onClick={() => window.location.reload()}>
             <LogOut size={14} /> LEAVE
           </Button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        
        {/* Left: Main Auction Area */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 gap-6 overflow-y-auto custom-scrollbar">
          
          {state.status === 'LOBBY' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="text-center">
                 <h2 className="text-4xl font-black italic mb-2 uppercase flex items-center gap-3 justify-center">
                   <Trophy className="text-yellow-500 w-10 h-10" />
                   Awaiting Managers
                 </h2>
                 <p className="text-slate-500">Share room code <span className="text-yellow-500 font-bold underline decoration-dotted">{state.roomId}</span></p>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl">
                 {TEAMS.map(t => {
                   const teamState = state.teams[t.id];
                   const isJoined = !!teamState.joinedBy;
                   const isMe = t.id === userTeamId;
                   const contrastClass = isJoined ? getContrastColor(t.color) : 'text-slate-500';
                   return (
                     <div 
                      key={t.id} 
                      className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 shadow-lg ${isJoined ? 'scale-105 shadow-xl' : 'opacity-40 grayscale'}`}
                      style={{ 
                        backgroundColor: isJoined ? t.color : 'rgba(30, 41, 59, 0.5)',
                        borderColor: isMe ? '#ffffff' : (isJoined ? 'rgba(255,255,255,0.2)' : 'transparent')
                      }}
                     >
                        {isMe && <div className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-widest">YOU</div>}
                        <img src={t.logo} className="w-16 h-16 bg-white rounded-full p-2 shadow-inner" alt={t.name} />
                        <div className="text-center">
                          <div className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${isJoined ? 'opacity-80' : ''} ${contrastClass}`}>{t.name}</div>
                          <div className={`text-sm font-bold truncate max-w-[120px] ${contrastClass}`}>{teamState.joinedBy || 'EMPTY'}</div>
                        </div>
                     </div>
                   );
                 })}
               </div>

               {state.hostId === userTeamId && (
                 <Button onClick={startAuction} className="px-12 py-5 text-2xl font-black italic rounded-3xl h-auto shadow-2xl">START AUCTION</Button>
               )}
            </div>
          ) : (
            <>
              {/* Player Card */}
              <div 
                className={`relative bg-[#1a1e26] rounded-[2.5rem] border-4 overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[450px] transition-colors duration-500`}
                style={{ borderColor: currentBidderConfig ? currentBidderConfig.color : 'rgba(255,255,255,0.05)' }}
              >
                 <StatusBanner info={state.lastSoldInfo} />
                 
                 <div className="lg:w-2/5 p-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-r border-white/5 relative">
                    <div className="text-center relative z-10">
                      <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border border-white/5">
                        <Globe size={10} /> {currentPlayer?.country}
                      </div>
                      <h3 className="text-5xl font-black italic text-white uppercase tracking-tighter leading-none">{currentPlayer?.name}</h3>
                      <div className="text-blue-400 font-bold uppercase text-lg mt-4 tracking-widest">{currentPlayer?.role}</div>
                    </div>
                 </div>

                 <div className="flex-1 p-10 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                       <div>
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1">Base Price</span>
                         <span className="text-3xl font-black text-white">₹{currentPlayer ? (currentPlayer.basePrice / 100).toFixed(2) : 0} Cr</span>
                       </div>
                       <div className="text-right">
                         <div className={`text-7xl font-black italic select-none ${state.timer <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
                           {state.timer.toString().padStart(2, '0')}
                         </div>
                       </div>
                    </div>

                    <div className="my-6 p-6 bg-black/20 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Current Bid</span>
                       <div className="text-7xl font-black text-green-400 bid-pulse tracking-tighter">
                         ₹{(state.currentBid / 100).toFixed(2)} Cr
                       </div>
                       <div className="mt-4 flex items-center gap-2 px-6 py-2 bg-white/5 rounded-full border border-white/10 z-10">
                         {state.currentBidder ? (
                           <>
                             <img src={currentBidderConfig?.logo} className="w-5 h-5 rounded-full bg-white p-0.5" />
                             <span className="text-xs font-bold text-slate-300 uppercase">Held by {currentBidderConfig?.name}</span>
                           </>
                         ) : (
                           <span className="text-xs font-bold text-slate-500 uppercase italic">Awaiting first bid</span>
                         )}
                       </div>
                    </div>

                    {state.status === 'AUCTION' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[10, 20, 50].map(inc => {
                            const amount = state.currentBidder ? state.currentBid + inc : state.currentBid;
                            const isDisabled = state.isPaused || myTeam.purse < amount || state.currentBidder === userTeamId;
                            return (
                              <button 
                                key={inc}
                                onClick={() => placeBid(userTeamId, amount)}
                                disabled={isDisabled}
                                className={`py-4 rounded-2xl border border-white/10 transition-all active:scale-95 font-black text-xl flex flex-col items-center justify-center
                                  ${isDisabled ? 'bg-slate-900 text-slate-700' : `${teamContrastClass} hover:brightness-110 shadow-lg`}
                                `}
                                style={!isDisabled ? { backgroundColor: teamPrimaryColor } : {}}
                              >
                                +{inc}L
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex gap-3">
                          <form onSubmit={handleCustomBid} className="flex-1 flex gap-2">
                             <input 
                              type="number" 
                              step="0.01"
                              value={customBid}
                              onChange={(e) => setCustomBid(e.target.value)}
                              placeholder="Custom (Cr)"
                              className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-blue-500"
                             />
                             <button 
                              type="submit"
                              disabled={state.isPaused || state.currentBidder === userTeamId}
                              className={`px-6 rounded-2xl font-black transition-all ${state.currentBidder === userTeamId ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                             >
                               BID
                             </button>
                          </form>
                        </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg">
                   <div className="flex items-center gap-3 mb-4">
                     <Award className="text-yellow-500" />
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">My Budget</h4>
                   </div>
                   <div className="text-3xl font-black text-white">₹{(myTeam.purse / 100).toFixed(2)} Cr</div>
                </div>

                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg">
                   <div className="flex items-center gap-3 mb-4">
                     <Layout className="text-blue-500" />
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Squad Size</h4>
                   </div>
                   <div className="text-3xl font-black text-white">{myTeam.squad.length} / 25</div>
                </div>

                <div className="bg-[#1a1e26] p-6 rounded-3xl border border-white/5 shadow-lg">
                   <div className="flex items-center gap-3 mb-4">
                     <ChevronRight className="text-slate-500" />
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Next Up</h4>
                   </div>
                   {nextPlayer ? (
                     <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-lg">{nextPlayer.name}</div>
                        <div className="text-slate-400 font-black">₹{nextPlayer.basePrice / 100}Cr</div>
                     </div>
                   ) : <div className="text-slate-600 italic">No more players</div>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Sidebar Tabs */}
        <div className="w-full lg:w-96 shrink-0 bg-[#161920] border-l border-white/5 flex flex-col h-full shadow-2xl">
           
           <div className="flex border-b border-white/5 p-2">
              {[
                { id: 'ACTIVITY', icon: History, label: 'Activity' },
                { id: 'CHAT', icon: MessageCircle, label: 'Chat' },
                { id: 'SQUAD', icon: Award, label: 'Squad' },
                { id: 'SETTINGS', icon: SettingsIcon, label: 'Info' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center gap-1 py-4 px-1 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <tab.icon size={20} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
                </button>
              ))}
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              {activeTab === 'ACTIVITY' && (
                <div className="space-y-4">
                   {state.activity.map(log => (
                     <div key={log.id} className="animate-in slide-in-from-right-2 duration-300">
                       {log.type === 'BID' && (
                         <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2">
                              <img src={TEAMS.find(t => t.id === log.teamId)?.logo} className="w-6 h-6 rounded-full bg-white p-0.5" />
                              <span className="text-xs font-black uppercase text-slate-300">{TEAMS.find(t => t.id === log.teamId)?.shortName}</span>
                            </div>
                            <span className="text-sm font-black text-green-400">₹{(log.amount! / 100).toFixed(2)} Cr</span>
                         </div>
                       )}
                       {(log.type === 'SOLD' || log.type === 'UNSOLD') && (
                         <div className={`p-4 rounded-2xl border ${log.type === 'SOLD' ? 'bg-green-600/10 border-green-600/20' : 'bg-red-600/10 border-red-600/20'}`}>
                            <div className="text-[10px] font-black uppercase mb-1">{log.type}</div>
                            <div className="text-sm font-black uppercase">{log.playerName}</div>
                         </div>
                       )}
                     </div>
                   ))}
                </div>
              )}

              {activeTab === 'CHAT' && (
                <div className="flex flex-col h-full relative">
                   <div className="flex-1 space-y-4 pb-20">
                      {state.messages.length === 0 ? (
                        <div className="text-center py-20 text-slate-700 font-bold italic">Start the conversation...</div>
                      ) : (
                        state.messages.map((msg) => {
                          const isMe = msg.teamId === userTeamId;
                          const team = TEAMS.find(t => t.id === msg.teamId);
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                               <div className="flex items-center gap-2 mb-1">
                                  {!isMe && <img src={team?.logo} className="w-4 h-4 rounded-full bg-white" alt="" />}
                                  <span className="text-[10px] font-black text-slate-500 uppercase">{msg.sender} ({team?.shortName})</span>
                               </div>
                               <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                                 {msg.text}
                               </div>
                               <span className="text-[8px] text-slate-700 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                   </div>
                   
                   <div className="absolute bottom-0 left-0 right-0 bg-[#161920] pt-4">
                      <form onSubmit={handleSendChat} className="flex gap-2">
                         <input 
                           type="text" 
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           placeholder="Type a message..."
                           className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
                         />
                         <button type="submit" className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors">
                           <Send size={18} />
                         </button>
                      </form>
                   </div>
                </div>
              )}

              {activeTab === 'SQUAD' && (
                <div className="space-y-6">
                  {TEAMS.map(team => {
                    const ts = state.teams[team.id];
                    return (
                      <div key={team.id} className="rounded-3xl p-5 border bg-white/5 border-white/5">
                         <div className="flex items-center gap-3 mb-2">
                           <img src={team.logo} className="w-6 h-6 bg-white rounded-full p-0.5" />
                           <span className="text-sm font-black uppercase text-slate-300">{team.name}</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5 mt-2">
                            {ts.squad.map((p, i) => (
                               <div key={i} className="px-2 py-1 bg-black/40 rounded-lg text-[10px] font-bold text-slate-400">
                                 {p.name}
                               </div>
                            ))}
                         </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'SETTINGS' && (
                <div className="space-y-6">
                   <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Room Information</div>
                      <div className="space-y-3">
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Room Code</span>
                           <span className="font-black text-yellow-500">{state.roomId}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Current Player</span>
                           <span className="font-black text-white">{state.currentPlayerIndex + 1} / {INITIAL_PLAYER_POOL.length}</span>
                         </div>
                      </div>
                   </div>
                </div>
              )}

           </div>
        </div>
      </div>
    </div>
  );
};

export default App;