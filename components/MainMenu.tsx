
import React, { useState, useEffect, useRef } from 'react';
import { Region, SkinConfig, Friend, SettingsConfig, LoadoutConfig, AbilityType, WeaponType, GrenadeType } from '../types';
import { REGIONS, COSMETICS, WEAPON_STATS, ABILITY_STATS, GRENADE_STATS } from '../constants';
import { sfx } from '../utils/SoundManager';
import { Globe, Users, Trophy, Wifi, Shirt, Crown, Eye, UserPlus, Play, X, Palette, User, Settings, Volume2, Backpack, Crosshair, Bomb, Zap } from 'lucide-react';

interface MainMenuProps {
  onStart: (name: string, region: Region) => void;
  skinConfig: SkinConfig;
  onUpdateSkin: (skin: SkinConfig) => void;
  settings: SettingsConfig;
  onUpdateSettings: (s: SettingsConfig) => void;
  loadout: LoadoutConfig;
  onUpdateLoadout: (l: LoadoutConfig) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, skinConfig, onUpdateSkin, settings, onUpdateSettings, loadout, onUpdateLoadout }) => {
  const [name, setName] = useState('');
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const [livePing, setLivePing] = useState(region.ping);
  const [showLocker, setShowLocker] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLoadout, setShowLoadout] = useState(false);
  
  // Fake Friends Persistence
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendId, setNewFriendId] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Initialize Audio
  useEffect(() => {
    const handleInteraction = () => sfx.init();
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  useEffect(() => {
     const savedFriends = localStorage.getItem('bitbrawl_friends');
     if (savedFriends) setFriends(JSON.parse(savedFriends));
     
     const savedName = localStorage.getItem('bitbrawl_name');
     if (savedName) setName(savedName);
  }, []);

  const handleNameChange = (val: string) => {
      setName(val.slice(0, 12));
      localStorage.setItem('bitbrawl_name', val.slice(0, 12));
  };

  const addFriend = () => {
     if (!newFriendId) return;
     sfx.playClick();
     const newFriend: Friend = { id: newFriendId, name: `Player_${newFriendId.slice(0,4)}`, status: 'offline' };
     const updated = [...friends, newFriend];
     setFriends(updated);
     localStorage.setItem('bitbrawl_friends', JSON.stringify(updated));
     setNewFriendId('');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePing(prev => {
        const jitter = Math.floor(Math.random() * 10) - 5;
        return Math.max(10, region.ping + jitter);
      });
      setFriends(prev => prev.map(f => ({
         ...f,
         status: Math.random() > 0.7 ? 'online' : Math.random() > 0.8 ? 'in-game' : 'offline'
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [region]);

  // Canvas Drawing Logic for Preview
  useEffect(() => {
    if (!showLocker || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const render = () => {
      if (!ctx || !canvasRef.current) return;
      frame += 0.05;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(3, 3);
      
      const footOffset = Math.sin(frame * 5) * 3;
      ctx.fillStyle = '#1f2937'; ctx.fillRect(-12 + footOffset, 8, 8, 8); ctx.fillRect(-12 - footOffset, -18, 8, 8);
      ctx.fillStyle = '#111'; ctx.fillRect(-18, -8, 4, 16); 

      // Body
      ctx.fillStyle = skinConfig.color; 
      ctx.lineWidth = 2; ctx.strokeStyle = '#000'; 
      ctx.beginPath(); ctx.rect(-14, -14, 28, 28); ctx.fill(); ctx.stroke();
      
      // Clothes
      if (skinConfig.clothes === 'suit') {
         ctx.fillStyle = '#111'; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(0, -6); ctx.lineTo(6, -14); ctx.fill(); ctx.fillStyle = 'red'; ctx.fillRect(-1, -6, 2, 4);
      } else if (skinConfig.clothes === 'overalls') {
         ctx.fillStyle = '#1d4ed8'; ctx.fillRect(-14, 0, 28, 14); ctx.fillRect(-12, -14, 4, 28); ctx.fillRect(8, -14, 4, 28);
      } else if (skinConfig.clothes === 'military') {
         ctx.fillStyle = '#3f6212'; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = '#1a2e05'; ctx.fillRect(-10, -5, 20, 10);
      } else if (skinConfig.clothes === 'tanktop') {
         ctx.fillStyle = '#fff'; ctx.fillRect(-12, -14, 24, 28);
      } else if (skinConfig.clothes === 'ninja') {
         ctx.fillStyle = '#111'; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = '#ef4444'; ctx.fillRect(-14, -5, 28, 4);
      } else if (skinConfig.clothes === 'hoodie') {
         ctx.fillStyle = '#555'; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = '#333'; ctx.fillRect(-5, -5, 10, 10);
      }

      // Eyes
      const blink = Math.sin(frame * 2) > 0.95;
      if (skinConfig.eyes === 'normal' || skinConfig.eyes === 'angry' || skinConfig.eyes === 'kawaii') {
          ctx.fillStyle = '#fff'; 
          if (!blink) {
             ctx.fillRect(2, -8, 6, 6); ctx.fillRect(2, 2, 6, 6);
             ctx.fillStyle = '#000'; ctx.fillRect(5, -6, 2, 2); ctx.fillRect(5, 4, 2, 2);
             if (skinConfig.eyes === 'angry') { ctx.fillStyle = '#000'; ctx.fillRect(2, -9, 8, 2); ctx.fillRect(2, 1, 8, 2); }
             if (skinConfig.eyes === 'kawaii') { ctx.fillStyle = 'pink'; ctx.globalAlpha = 0.5; ctx.fillRect(2, -4, 6, 2); ctx.fillRect(2, 6, 6, 2); ctx.globalAlpha = 1.0; }
          } else {
             ctx.fillStyle = '#000'; ctx.fillRect(2, -6, 6, 2); ctx.fillRect(2, 4, 6, 2);
          }
      } else if (skinConfig.eyes === 'cyclops') {
          ctx.fillStyle = '#fff'; ctx.fillRect(2, -3, 8, 8); ctx.fillStyle = 'red'; ctx.fillRect(5, -1, 4, 4);
      } else if (skinConfig.eyes === 'shades') {
          ctx.fillStyle = '#000'; ctx.fillRect(2, -8, 10, 16); ctx.fillStyle = '#444'; ctx.fillRect(3, -6, 4, 4);
      } else if (skinConfig.eyes === 'blindfold') {
          ctx.fillStyle = '#333'; ctx.fillRect(0, -10, 14, 20);
      } else if (skinConfig.eyes === 'robot') {
          ctx.fillStyle = 'cyan'; ctx.fillRect(2, -8, 8, 6); ctx.fillRect(2, 2, 8, 6);
      } else if (skinConfig.eyes === 'laser') {
          ctx.fillStyle = 'red'; ctx.fillRect(2, -8, 8, 2); ctx.fillRect(2, 2, 8, 2); ctx.shadowBlur = 5; ctx.shadowColor = 'red'; ctx.fillRect(4, -8, 4, 2); ctx.shadowBlur = 0;
      }

      // Hats
      ctx.fillStyle = '#fbbf24';
      if (skinConfig.hat === 'crown') ctx.fillRect(-14, -20, 28, 6);
      if (skinConfig.hat === 'halo') { ctx.strokeStyle = 'yellow'; ctx.beginPath(); ctx.ellipse(0, -22, 10, 3, 0, 0, Math.PI*2); ctx.stroke(); }
      if (skinConfig.hat === 'mohawk') { ctx.fillStyle = 'red'; ctx.fillRect(0, -22, 4, 10); }
      if (skinConfig.hat === 'viking') { ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-14, -24); ctx.lineTo(-6, -14); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -14); ctx.lineTo(14, -24); ctx.lineTo(6, -14); ctx.fill(); }
      if (skinConfig.hat === 'headphones') { ctx.fillStyle = '#333'; ctx.fillRect(-16, -10, 4, 12); ctx.fillRect(12, -10, 4, 12); ctx.fillRect(-16, -12, 32, 2); }
      if (skinConfig.hat === 'tophat') { ctx.fillStyle = '#111'; ctx.fillRect(-12, -28, 24, 14); ctx.fillRect(-16, -14, 32, 4); }
      if (skinConfig.hat === 'helmet') { ctx.fillStyle = '#555'; ctx.fillRect(-15, -20, 30, 8); ctx.fillRect(-12, -24, 24, 4); }

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [showLocker, skinConfig]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/60 backdrop-blur-[2px]" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl p-4">
        <div className="mb-4 text-center animate-bounce">
          <h1 className="font-pixel text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
            BIT BRAWL
          </h1>
        </div>

        <div className="flex gap-4 w-full h-[60vh]">
          
          <div className="flex-1 bg-gray-800/90 backdrop-blur-md border-2 border-gray-600 p-8 shadow-2xl rounded-lg flex flex-col gap-4">
            <div className="flex justify-between">
                <div>
                    <label className="block text-gray-400 text-[10px] font-pixel mb-1 uppercase">Callsign</label>
                    <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Enter Name..." className="w-full bg-black/50 border border-gray-600 text-white p-3 focus:outline-none focus:border-yellow-500 font-pixel text-sm" />
                </div>
                <button onClick={() => {sfx.playClick(); setShowSettings(true)}} className="bg-gray-700 p-3 rounded hover:bg-gray-600 border border-gray-500"><Settings size={20}/></button>
            </div>

            <div className="flex-1">
              <label className="block text-gray-400 text-[10px] font-pixel mb-1 uppercase">Region</label>
              <div className="grid grid-cols-2 gap-2 h-full content-start">
                {REGIONS.map((r) => (
                  <button key={r.id} onClick={() => {sfx.playClick(); setRegion(r)}} className={`flex flex-col items-center justify-center p-2 border-b-4 transition-all ${region.id === r.id ? 'bg-blue-900/80 border-blue-600 text-blue-100' : 'bg-gray-700/50 border-gray-800 hover:bg-gray-700 text-gray-400'}`}>
                    <span className="font-bold text-[10px] font-pixel">{r.name}</span>
                    <span className="text-[10px] font-mono">{region.id === r.id ? livePing : r.ping}ms</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => {sfx.playClick(); setShowLoadout(true)}} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-pixel text-xs py-3 border-b-4 border-gray-900 active:border-b-0 active:mt-1 flex items-center justify-center gap-2"><Backpack size={16} /> LOADOUT</button>
              <button onClick={() => {sfx.playClick(); setShowLocker(true)}} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-pixel text-xs py-3 border-b-4 border-gray-900 active:border-b-0 active:mt-1 flex items-center justify-center gap-2"><Shirt size={16} /> LOCKER</button>
              <button onClick={() => {sfx.playClick(); setShowFriends(true)}} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-pixel text-xs py-3 border-b-4 border-gray-900 active:border-b-0 active:mt-1 flex items-center justify-center gap-2"><Users size={16} /> SOCIAL</button>
            </div>

            <button onClick={() => {sfx.playClick(); onStart(name, region)}} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-pixel text-lg py-4 border-b-4 border-yellow-800 active:border-b-0 active:mt-1">PLAY</button>
          </div>

          {showFriends && (
             <div className="w-72 bg-gray-900/95 border-2 border-gray-600 p-4 flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="font-pixel text-white text-sm">FRIENDS</h2>
                   <button onClick={() => setShowFriends(false)}><X size={16} className="text-gray-400 hover:text-white"/></button>
                </div>
                <div className="flex gap-2 mb-4">
                   <input value={newFriendId} onChange={e => setNewFriendId(e.target.value)} placeholder="Add Friend ID" className="bg-black/50 border border-gray-700 text-white text-xs p-2 flex-1 font-mono" />
                   <button onClick={addFriend} className="bg-green-600 p-2 text-white"><UserPlus size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                   {friends.map((f, i) => (
                      <div key={i} className="bg-gray-800 p-2 flex items-center justify-between rounded border border-gray-700">
                         <div>
                            <div className="text-xs text-white font-bold">{f.name}</div>
                            <div className={`text-[10px] ${f.status === 'online' ? 'text-green-400' : f.status === 'in-game' ? 'text-yellow-400' : 'text-gray-500'}`}>{f.status.toUpperCase()}</div>
                         </div>
                         {f.status === 'in-lobby' && <button className="bg-blue-600 px-2 py-1 text-[10px] text-white">JOIN</button>}
                      </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
           <div className="bg-gray-800 border-4 border-gray-600 rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="font-pixel text-white text-lg flex items-center gap-2"><Settings/> SETTINGS</h2>
                 <button onClick={() => {sfx.playClick(); setShowSettings(false)}}><X className="text-gray-400"/></button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-pixel text-gray-400 mb-2 block flex items-center gap-2"><Volume2 size={14}/> MASTER VOLUME</label>
                    <input type="range" min="0" max="1" step="0.1" value={settings.masterVolume} onChange={(e) => onUpdateSettings({...settings, masterVolume: parseFloat(e.target.value)})} className="w-full accent-yellow-500" />
                 </div>
                 <div>
                    <label className="text-xs font-pixel text-gray-400 mb-2 block">SFX VOLUME</label>
                    <input type="range" min="0" max="1" step="0.1" value={settings.sfxVolume} onChange={(e) => onUpdateSettings({...settings, sfxVolume: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
                 </div>
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-pixel text-gray-400">SCREEN SHAKE</label>
                    <button onClick={() => onUpdateSettings({...settings, screenShake: !settings.screenShake})} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.screenShake ? 'bg-green-600' : 'bg-gray-600'}`}>
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.screenShake ? 'translate-x-6' : ''}`} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showLoadout && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
           <div className="bg-gray-800 border-4 border-gray-600 rounded-lg p-6 w-full max-w-4xl h-[70vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                 <h2 className="font-pixel text-white text-lg flex items-center gap-2"><Backpack/> LOADOUT</h2>
                 <button onClick={() => {sfx.playClick(); setShowLoadout(false)}}><X className="text-gray-400"/></button>
              </div>
              
              <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
                 {/* Column 1: Primary Weapon */}
                 <div className="flex flex-col h-full">
                    <h3 className="font-pixel text-yellow-400 text-xs mb-4 flex items-center gap-2"><Crosshair size={14}/> PRIMARY</h3>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                       {Object.keys(WEAPON_STATS).filter(w => !WEAPON_STATS[w as WeaponType].isMelee).map((w) => (
                          <button key={w} onClick={() => {sfx.playClick(); onUpdateLoadout({...loadout, primary: w as WeaponType})}}
                             className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${loadout.primary === w ? 'bg-yellow-900/50 border-yellow-400 shadow-md transform scale-105' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                             <span className="font-pixel text-[10px] text-white">{w}</span>
                             {loadout.primary === w && <div className="w-2 h-2 bg-yellow-400 rounded-full"/>}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Column 2: Grenade */}
                 <div className="flex flex-col h-full">
                    <h3 className="font-pixel text-red-400 text-xs mb-4 flex items-center gap-2"><Bomb size={14}/> GRENADE [G]</h3>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                       {Object.values(GrenadeType).map((g) => (
                          <button key={g} onClick={() => {sfx.playClick(); onUpdateLoadout({...loadout, grenade: g})}}
                             className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${loadout.grenade === g ? 'bg-red-900/50 border-red-400 shadow-md transform scale-105' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                             <span className="font-pixel text-[10px] text-white">{g}</span>
                             {loadout.grenade === g && <div className="w-2 h-2 bg-red-400 rounded-full"/>}
                          </button>
                       ))}
                    </div>
                    <div className="mt-2 p-2 bg-black/40 rounded border border-gray-700 text-[10px] text-gray-300">
                        Stats: {GRENADE_STATS[loadout.grenade].damage} DMG
                    </div>
                 </div>

                 {/* Column 3: Ability */}
                 <div className="flex flex-col h-full">
                    <h3 className="font-pixel text-blue-400 text-xs mb-4 flex items-center gap-2"><Zap size={14}/> SPECIAL [E]</h3>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                       {Object.values(AbilityType).map((a) => (
                          <button key={a} onClick={() => {sfx.playClick(); onUpdateLoadout({...loadout, ability: a})}}
                             className={`w-full p-3 rounded border text-left flex justify-between items-center transition-all ${loadout.ability === a ? 'bg-blue-900/50 border-blue-400 shadow-md transform scale-105' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                             <span className="font-pixel text-[10px] text-white">{a}</span>
                             {loadout.ability === a && <div className="w-2 h-2 bg-blue-400 rounded-full"/>}
                          </button>
                       ))}
                    </div>
                    <div className="mt-2 p-2 bg-black/40 rounded border border-gray-700 text-[10px] text-gray-300">
                        {ABILITY_STATS[loadout.ability].desc}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showLocker && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-gray-800 border-4 border-gray-600 rounded-lg shadow-2xl w-full max-w-4xl h-[70vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2 p-6">
                 <h2 className="font-pixel text-white text-lg flex items-center gap-2"><Shirt/> LOCKER</h2>
                 <button onClick={() => {sfx.playClick(); setShowLocker(false)}}><X className="text-gray-400"/></button>
              </div>
              <div className="grid grid-cols-4 gap-4 p-6 overflow-y-auto custom-scrollbar">
                  <div>
                      <h3 className="font-pixel text-xs text-gray-400 mb-2">COLOR</h3>
                      <div className="grid grid-cols-3 gap-2">
                          {COSMETICS.colors.map(c => (
                              <button key={c.id} onClick={() => onUpdateSkin({...skinConfig, color: c.id})} className={`w-8 h-8 rounded border-2 ${skinConfig.color === c.id ? 'border-white scale-110' : 'border-transparent hover:border-gray-500'}`} style={{backgroundColor: c.id}} />
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="font-pixel text-xs text-gray-400 mb-2">HAT</h3>
                      <div className="space-y-1">
                          {COSMETICS.hats.map(h => (
                              <button key={h.id} onClick={() => onUpdateSkin({...skinConfig, hat: h.id})} className={`w-full text-left text-[10px] p-2 rounded ${skinConfig.hat === h.id ? 'bg-yellow-900 text-yellow-400 border border-yellow-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{h.name}</button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="font-pixel text-xs text-gray-400 mb-2">EYES</h3>
                      <div className="space-y-1">
                          {COSMETICS.eyes.map(e => (
                              <button key={e.id} onClick={() => onUpdateSkin({...skinConfig, eyes: e.id})} className={`w-full text-left text-[10px] p-2 rounded ${skinConfig.eyes === e.id ? 'bg-blue-900 text-blue-400 border border-blue-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{e.name}</button>
                          ))}
                      </div>
                  </div>
                   <div>
                      <h3 className="font-pixel text-xs text-gray-400 mb-2">OUTFIT</h3>
                      <div className="space-y-1">
                          {COSMETICS.clothes.map(c => (
                              <button key={c.id} onClick={() => onUpdateSkin({...skinConfig, clothes: c.id})} className={`w-full text-left text-[10px] p-2 rounded ${skinConfig.clothes === c.id ? 'bg-green-900 text-green-400 border border-green-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{c.name}</button>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="p-6 border-t border-gray-700 bg-gray-900/50 flex justify-center">
                  <canvas ref={canvasRef} width={200} height={200} className="w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-600 shadow-inner" />
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
