import React, { useState } from 'react';
import { Region, GameMode } from '../types';
import { User, Shield, Zap, Target, Skull, Crosshair, Biohazard } from 'lucide-react';

interface LobbyProps {
  playerName: string;
  region: Region;
  onStart: (mode: GameMode, roomId?: string) => void;
  onBack: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ playerName, region, onStart, onBack }) => {
  const [joinId, setJoinId] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(GameMode.GUN_GAME);

  const handleCreate = () => onStart(selectedGameMode); // Host sends mode to GameCanvas via state
  
  // Note: For public matchmaking, we just pass the mode. 
  // For private hosting, the mode is set by the host.
  // This component simplifies the flow: You pick a mode, then you pick Host or Join (if join, mode depends on host).

  return (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-6xl h-[80vh] flex bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden rounded-lg">
        
        {/* Left: Game Mode Selection */}
        <div className="w-1/3 bg-gray-900 border-r border-gray-700 flex flex-col p-6 overflow-y-auto">
           <h2 className="font-pixel text-white text-xl mb-6">GAME MODES</h2>
           <div className="space-y-4">
              {[
                { id: GameMode.GUN_GAME, icon: <Target className="text-yellow-400"/>, desc: "FFA. Upgrade weapon on kill. Last weapon wins." },
                { id: GameMode.TDM, icon: <Shield className="text-blue-400"/>, desc: "Red vs Blue. First team to 50 kills wins." },
                { id: GameMode.ONE_IN_CHAMBER, icon: <Crosshair className="text-red-400"/>, desc: "1 HP. 1 Bullet. Kill to get ammo." },
                { id: GameMode.ZOMBIES, icon: <Biohazard className="text-green-400"/>, desc: "Survivor vs Infected. Don't get bitten." },
              ].map((m) => (
                <button 
                  key={m.id}
                  onClick={() => setSelectedGameMode(m.id)}
                  className={`w-full p-4 rounded border-2 text-left transition-all ${selectedGameMode === m.id ? 'bg-gray-800 border-white shadow-lg scale-105' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-400'}`}
                >
                   <div className="flex items-center gap-3 mb-2">
                      {m.icon}
                      <span className="font-bold font-pixel text-xs text-white">{m.id.toUpperCase()}</span>
                   </div>
                   <p className="text-xs text-gray-500">{m.desc}</p>
                </button>
              ))}
           </div>
           
           <div className="mt-auto pt-6">
              <button onClick={onBack} className="text-red-400 text-xs font-pixel hover:underline">BACK TO MENU</button>
           </div>
        </div>

        {/* Right: Deployment */}
        <div className="flex-1 flex flex-col bg-gray-800/50 p-8">
           <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
              <div>
                 <h1 className="font-pixel text-3xl text-white">DEPLOYMENT</h1>
                 <p className="text-gray-400 text-sm mt-1">{region.name} Server</p>
              </div>
              <div className="text-right">
                 <div className="font-pixel text-xs text-yellow-400">MODE</div>
                 <div className="font-bold text-white text-xl">{selectedGameMode}</div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6 h-full">
              {/* Public */}
              <div className="bg-green-900/10 border-2 border-green-900/50 hover:border-green-500 rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer group transition-all"
                   onClick={() => onStart(selectedGameMode)}>
                 <div className="w-16 h-16 rounded-full bg-green-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Target size={32} className="text-green-400" />
                 </div>
                 <h3 className="font-pixel text-green-400 text-lg mb-2">PUBLIC MATCH</h3>
                 <p className="text-gray-400 text-center text-sm">Find a match instantly with random players.</p>
              </div>

              {/* Private */}
              <div className="flex flex-col gap-4">
                 <div className="flex-1 bg-purple-900/10 border-2 border-purple-900/50 hover:border-purple-500 rounded-lg p-4 flex flex-col justify-center items-center cursor-pointer transition-all"
                      onClick={() => onStart(selectedGameMode, 'HOST')}>
                    <Zap size={24} className="text-purple-400 mb-2" />
                    <h3 className="font-pixel text-purple-400 text-sm">HOST PRIVATE</h3>
                 </div>

                 <div className="flex-1 bg-blue-900/10 border-2 border-blue-900/50 hover:border-blue-500 rounded-lg p-4 flex flex-col justify-center items-center cursor-pointer transition-all">
                    <User size={24} className="text-blue-400 mb-2" />
                    <h3 className="font-pixel text-blue-400 text-sm mb-2">JOIN PRIVATE</h3>
                    <div className="flex gap-2 w-full">
                       <input 
                         value={joinId} 
                         onChange={e => setJoinId(e.target.value)} 
                         onClick={e => e.stopPropagation()}
                         placeholder="ROOM CODE" 
                         className="flex-1 bg-black/50 border border-gray-700 text-white text-xs p-2 text-center"
                       />
                       <button onClick={(e) => { e.stopPropagation(); if(joinId) onStart(selectedGameMode, joinId); }} className="bg-blue-600 px-3 text-white font-bold text-xs">GO</button>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default Lobby;