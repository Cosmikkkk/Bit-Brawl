
import React, { useState, useEffect } from 'react';
import { GameState, Region, GameMode, SkinConfig, SettingsConfig, LoadoutConfig, WeaponType, AbilityType, GrenadeType } from './types';
import { REGIONS, COSMETICS } from './constants';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import Lobby from './components/Lobby';
import { sfx } from './utils/SoundManager';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<Region>(REGIONS[0]);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Customization State
  const [skinConfig, setSkinConfig] = useState<SkinConfig>({
    color: COSMETICS.colors[0].id,
    hat: 'none',
    eyes: 'normal',
    clothes: 'none'
  });

  const [loadout, setLoadout] = useState<LoadoutConfig>({
      primary: WeaponType.ASSAULT_RIFLE,
      grenade: GrenadeType.FRAG,
      ability: AbilityType.DASH
  });

  const [settings, setSettings] = useState<SettingsConfig>({
    masterVolume: 0.5,
    sfxVolume: 0.5,
    musicVolume: 0.5,
    screenShake: true,
    particles: true
  });

  // Load Config from LocalStorage
  useEffect(() => {
    const savedSkin = localStorage.getItem('bitbrawl_skin');
    if (savedSkin) { try { setSkinConfig(JSON.parse(savedSkin)); } catch (e) { console.error(e); } }

    const savedLoadout = localStorage.getItem('bitbrawl_loadout');
    if (savedLoadout) { try { setLoadout(JSON.parse(savedLoadout)); } catch (e) { console.error(e); } }
    
    const savedName = localStorage.getItem('bitbrawl_name');
    if (savedName) setPlayerName(savedName);
  }, []);

  const handleSaveSkin = (newSkin: SkinConfig) => {
    setSkinConfig(newSkin);
    localStorage.setItem('bitbrawl_skin', JSON.stringify(newSkin));
  };

  const handleSaveLoadout = (newLoadout: LoadoutConfig) => {
      setLoadout(newLoadout);
      localStorage.setItem('bitbrawl_loadout', JSON.stringify(newLoadout));
  };
  
  // Multiplayer Props
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.GUN_GAME);
  const [customRoomId, setCustomRoomId] = useState<string>('');

  // Custom Cursor Tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStartGame = (name: string, region: Region) => {
    setPlayerName(name || `Brawler_${Math.floor(Math.random() * 999)}`);
    setSelectedRegion(region);
    setGameState(GameState.LOBBY);
  };

  const handleLobbyStart = (mode: GameMode, roomId?: string) => {
    setGameMode(mode);
    if (roomId) setCustomRoomId(roomId); else setCustomRoomId(''); // Clear for public
    setGameState(GameState.CONNECTING);
    setTimeout(() => setGameState(GameState.PLAYING), 500);
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState(GameState.GAME_OVER);
  };

  const handleReturnToMenu = () => {
    setGameState(GameState.MENU);
  };

  const isUIInteractable = gameState === GameState.MENU || gameState === GameState.LOBBY || gameState === GameState.GAME_OVER;

  return (
    <div className="w-screen h-screen bg-gray-900 text-white overflow-hidden relative selection:bg-purple-500 selection:text-white cursor-none">
      
      {/* Background Game Renderer */}
      <div className={`absolute inset-0 z-0 ${gameState !== GameState.PLAYING ? 'filter blur-sm brightness-50 scale-105 transition-all duration-1000' : ''}`}>
        <GameCanvas 
          key={gameState === GameState.PLAYING ? 'active' : 'background'} 
          playerName={gameState === GameState.PLAYING ? playerName : "Spectator"} 
          regionId={selectedRegion.id}
          onGameOver={handleGameOver}
          onLeave={handleReturnToMenu}
          mode={gameState === GameState.PLAYING ? 'play' : 'spectate'}
          gameMode={gameMode}
          customRoomId={customRoomId}
          skinConfig={skinConfig}
          settings={settings}
          onUpdateSettings={setSettings}
          loadout={loadout}
        />
      </div>

      {/* UI Layers */}
      <div className={`relative z-10 w-full h-full pointer-events-none`}>
        <div className={`w-full h-full ${isUIInteractable ? 'pointer-events-auto' : ''}`}>
          {gameState === GameState.MENU && (
            <MainMenu 
              onStart={handleStartGame} 
              skinConfig={skinConfig}
              onUpdateSkin={handleSaveSkin}
              settings={settings}
              onUpdateSettings={setSettings}
              loadout={loadout}
              onUpdateLoadout={handleSaveLoadout}
            />
          )}

          {gameState === GameState.LOBBY && (
            <Lobby 
              playerName={playerName} 
              region={selectedRegion} 
              onStart={handleLobbyStart}
              onBack={handleReturnToMenu}
            />
          )}

          {gameState === GameState.CONNECTING && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
               <div className="flex flex-col items-center">
                 <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <h2 className="font-pixel text-xl text-yellow-400 animate-pulse">CONNECTING TO ARENA...</h2>
                 <p className="text-gray-400 mt-2 text-xs">
                   {!customRoomId ? `Region: ${selectedRegion.name}` : 'Establishing Secure Link...'}
                 </p>
               </div>
             </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 animate-fade-in">
              <h1 className="font-pixel text-5xl text-red-500 mb-6 tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">KO'D</h1>
              <div className="bg-gray-800 p-8 rounded-lg border-4 border-gray-600 shadow-2xl text-center">
                <p className="text-gray-400 mb-2 font-pixel text-xs">MATCH SCORE</p>
                <p className="font-pixel text-4xl text-yellow-400 mb-8">{finalScore}</p>
                
                <div className="flex gap-4">
                  <button onClick={() => { sfx.playClick(); setGameState(GameState.PLAYING); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 font-pixel text-xs border-b-4 border-green-800 active:border-b-0 active:mt-1 transition-all">RESPAWN</button>
                  <button onClick={() => { sfx.playClick(); handleReturnToMenu(); }} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 font-pixel text-xs border-b-4 border-gray-800 active:border-b-0 active:mt-1 transition-all">MENU</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Crosshair */}
      <div className="pointer-events-none fixed z-50 text-red-500 mix-blend-difference" style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
        <svg width="32" height="32" viewBox="0 0 100 100" className="opacity-80">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" fill="none" />
          <circle cx="50" cy="50" r="2" fill="currentColor" />
          <line x1="50" y1="0" x2="50" y2="20" stroke="currentColor" strokeWidth="4" />
          <line x1="50" y1="80" x2="50" y2="100" stroke="currentColor" strokeWidth="4" />
          <line x1="0" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="4" />
          <line x1="80" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
};

export default App;
