
import React, { useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { CONFIG, WEAPON_STATS, MAP_THEMES, COSMETICS, WEAPON_PROGRESSION, BOT_NAMES, ABILITY_STATS, GRENADE_STATS } from '../constants';
import { Player, Bullet, Particle, WeaponType, Vector2, Obstacle, ObstacleType, MapTheme, PacketType, JoinPacket, InputPacket, StatePacket, GameMode, PingPacket, PongPacket, SkinConfig, RoundPhase, RoundSyncPacket, VotePacket, GameStartPacket, LobbyUpdatePacket, PlayerRole, SettingsConfig, LoadoutConfig, AbilityType, GrenadeType, ActionPacket } from '../types';
import { Crown, Trophy, Crosshair, Skull, Clock, Zap, Repeat, Bomb, Settings, Volume2, LogOut, Play, X } from 'lucide-react';
import { sfx } from '../utils/SoundManager';

interface GameCanvasProps {
  playerName: string;
  regionId: string;
  onGameOver: (score: number) => void;
  onLeave: () => void;
  mode: 'play' | 'spectate';
  gameMode: GameMode;
  customRoomId?: string;
  skinConfig: SkinConfig;
  settings: SettingsConfig;
  onUpdateSettings: (s: SettingsConfig) => void;
  loadout: LoadoutConfig;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ playerName, regionId, onGameOver, onLeave, mode, gameMode, customRoomId, skinConfig, settings, onUpdateSettings, loadout }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // --- STATE REFS ---
  const myIdRef = useRef<string>('');
  const playerRef = useRef<Player | null>(null);
  const enemiesRef = useRef<Map<string, Player>>(new Map());
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const mountedRef = useRef<boolean>(true);
  
  // Logic
  const currentModeRef = useRef<GameMode>(gameMode);
  const roundPhaseRef = useRef<RoundPhase>(RoundPhase.LOBBY_WAITING);
  const roundTimeRef = useRef<number>(CONFIG.VOTE_DURATION);
  const votesRef = useRef<Map<string, number>>(new Map());
  const hasVotedRef = useRef<boolean>(false);
  const availableMapsRef = useRef<string[]>(Object.keys(MAP_THEMES).sort(() => 0.5 - Math.random()));
  const screenShakeRef = useRef<number>(0);

  // Network
  const isHostRef = useRef<boolean>(false);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const pingIntervalRef = useRef<number>(0);
  
  // Inputs
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<Vector2>({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);
  const camRef = useRef<Vector2>({ x: 0, y: 0 });
  const themeRef = useRef<MapTheme>(MAP_THEMES.GRASSLAND);

  // HUD
  const [hudState, setHudState] = useState({ 
     hp: 100, maxHp: 100, score: 0, weapon: WeaponType.PISTOL, 
     dashReady: true, kills: 0, weaponIndex: 0, ammo: 0,
     abilityReady: true, abilityCooldown: 0,
     grenadeReady: true, grenadeCooldown: 0,
     clipAmmo: 0, maxClip: 0, isReloading: false, reloadProgress: 0
  });
  const [networkStatus, setNetworkStatus] = useState<string>('Offline');
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number, kills: number, weapon: WeaponType, team?: string}[]>([]);
  const [roomCodeDisplay, setRoomCodeDisplay] = useState<string>('');
  const [ping, setPing] = useState<number>(0);
  const [roundInfo, setRoundInfo] = useState({ phase: RoundPhase.VOTING, time: CONFIG.VOTE_DURATION, votes: {} as Record<string, number> });
  const [killNotification, setKillNotification] = useState<{text: string, timestamp: number} | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<{id: string, name: string, role: PlayerRole}[]>([]);
  
  // Pause Menu
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Helpers
  const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
  const shake = (amount: number) => { if(settings.screenShake) screenShakeRef.current = amount; };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const checkCircleRect = (circle: {x: number, y: number, r: number}, rect: {x: number, y: number, width: number, height: number}) => {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    return (circle.x - closestX) ** 2 + (circle.y - closestY) ** 2 < circle.r ** 2;
  };

  const resolveWallCollision = (p: Player) => {
    for (const obs of obstaclesRef.current) {
      if (!obs.collidable) continue;
      if (checkCircleRect({x: p.pos.x, y: p.pos.y, r: p.radius}, obs)) {
        const closestX = Math.max(obs.x, Math.min(p.pos.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(p.pos.y, obs.y + obs.height));
        const dx = p.pos.x - closestX;
        const dy = p.pos.y - closestY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
           const overlap = p.radius - dist;
           p.pos.x += (dx / dist) * overlap;
           p.pos.y += (dy / dist) * overlap;
        }
      }
    }
  };

  const createExplosion = (pos: Vector2, color: string, count: number) => {
    if(!settings.particles) return;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(), pos: { ...pos },
        velocity: { x: randomRange(-4, 4), y: randomRange(-4, 4) },
        color: color, life: randomRange(10, 25), size: randomRange(2, 6)
      });
    }
  };

  const generateMap = (themeKey?: string) => {
    obstaclesRef.current = [];
    const themes = Object.values(MAP_THEMES);
    themeRef.current = themeKey && MAP_THEMES[themeKey] ? MAP_THEMES[themeKey] : themes[Math.floor(Math.random() * themes.length)];
    
    // Borders
    obstaclesRef.current.push(
      { id: 'w1', type: ObstacleType.WALL, x: -50, y: 0, width: 50, height: CONFIG.MAP_HEIGHT, color: '#000', collidable: true },
      { id: 'w2', type: ObstacleType.WALL, x: CONFIG.MAP_WIDTH, y: 0, width: 50, height: CONFIG.MAP_HEIGHT, color: '#000', collidable: true },
      { id: 'w3', type: ObstacleType.WALL, x: 0, y: -50, width: CONFIG.MAP_WIDTH, height: 50, color: '#000', collidable: true },
      { id: 'w4', type: ObstacleType.WALL, x: 0, y: CONFIG.MAP_HEIGHT, width: CONFIG.MAP_WIDTH, height: 50, color: '#000', collidable: true },
    );

    // Obstacle Clusters
    const numClusters = 8;
    for(let c = 0; c < numClusters; c++) {
       const clusterX = randomRange(200, CONFIG.MAP_WIDTH - 200);
       const clusterY = randomRange(200, CONFIG.MAP_HEIGHT - 200);
       if (Math.abs(clusterX - CONFIG.MAP_WIDTH/2) < 400 && Math.abs(clusterY - CONFIG.MAP_HEIGHT/2) < 400) continue;
       const w = randomRange(150, 250); const h = randomRange(150, 250);
       
       obstaclesRef.current.push(
           { id: `c_${c}_1`, type: ObstacleType.WALL, x: clusterX, y: clusterY, width: 20, height: h, color: themeRef.current.obstacleColor, collidable: true },
           { id: `c_${c}_2`, type: ObstacleType.WALL, x: clusterX, y: clusterY, width: w, height: 20, color: themeRef.current.obstacleColor, collidable: true },
           { id: `c_${c}_3`, type: ObstacleType.WALL, x: clusterX + w, y: clusterY, width: 20, height: h, color: themeRef.current.obstacleColor, collidable: true }
       );
    }

    // Floor Details (Non-collidable visual flair)
    for(let i=0; i<20; i++) {
        obstaclesRef.current.push({
            id: `d_${i}`, type: ObstacleType.FLOOR_DETAIL,
            x: randomRange(100, CONFIG.MAP_WIDTH-100), y: randomRange(100, CONFIG.MAP_HEIGHT-100),
            width: randomRange(20, 60), height: randomRange(20, 60),
            color: themeRef.current.grid, collidable: false
        });
    }
  };

  const useAbility = (p: Player) => {
    const stats = ABILITY_STATS[p.loadout.ability];
    if (Date.now() - p.lastAbility < stats.cooldown) return;
    p.lastAbility = Date.now();
    p.activeAbility = p.loadout.ability;
    p.abilityActiveUntil = Date.now() + stats.duration;
    
    // Immediate Effects
    if (p.loadout.ability === AbilityType.DASH) {
        p.velocity.x += Math.cos(p.angle) * 25;
        p.velocity.y += Math.sin(p.angle) * 25;
        createExplosion(p.pos, '#fff', 10);
    } else if (p.loadout.ability === AbilityType.HEAL) {
        p.hp = Math.min(p.hp + 50, p.maxHp);
        createExplosion(p.pos, '#10b981', 15);
    } else if (p.loadout.ability === AbilityType.BERSERK) {
        createExplosion(p.pos, '#ef4444', 15);
    } else if (p.loadout.ability === AbilityType.SHIELD) {
        createExplosion(p.pos, '#3b82f6', 15);
    }
  };

  const useGrenade = (p: Player) => {
      const stats = GRENADE_STATS[p.loadout.grenade];
      if (Date.now() - p.lastGrenade < stats.cooldown) return;
      p.lastGrenade = Date.now();
      
      const vel = { x: Math.cos(p.angle) * 15, y: Math.sin(p.angle) * 15 };
      bulletsRef.current.push({
          id: Math.random().toString(), ownerId: p.id, type: 'GRENADE',
          pos: { x: p.pos.x, y: p.pos.y }, velocity: vel,
          damage: stats.damage, radius: 8, color: stats.color,
          life: stats.fuse, maxLife: stats.fuse, grenadeType: p.loadout.grenade
      });
  };

  const reloadWeapon = (p: Player) => {
      if (p.isReloading || p.clipAmmo >= WEAPON_STATS[p.weapon].clipSize) return;
      const stats = WEAPON_STATS[p.weapon];
      p.isReloading = true;
      p.reloadEndTime = Date.now() + stats.reloadTime;
  };

  // --- NETWORK ---
  useEffect(() => {
    mountedRef.current = true;
    generateMap(); 
    if (mode === 'spectate') { initializeSpectatorMode(); return; }

    const initPeer = () => {
      setNetworkStatus("Initializing...");
      const myPeerId = (customRoomId === 'HOST') ? `BB-${Math.floor(Math.random()*99999)}` : undefined;
      const targetPeerId = (customRoomId && customRoomId !== 'HOST') ? customRoomId : (!customRoomId ? `bitbrawl-room-${regionId}` : undefined);

      if (customRoomId === 'HOST') currentModeRef.current = gameMode;

      const peer = new Peer(myPeerId, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', (id) => {
        if (!mountedRef.current) return;
        myIdRef.current = id;
        if (customRoomId === 'HOST') {
           becomeHost(id);
           setRoomCodeDisplay(id);
        } else if (targetPeerId) {
           connectToHost(targetPeerId);
        } else {
           becomeHost(`bitbrawl-room-${regionId}`);
        }
      });

      peer.on('error', (err) => {
         if (!mountedRef.current) return;
         if (!customRoomId && (err.type === 'peer-unavailable' || err.type === 'network' || err.type === 'socket-error')) {
             attemptHostSwitch();
         } else if (!customRoomId && err.type === 'unavailable-id') {
             connectToHost(`bitbrawl-room-${regionId}`);
         }
      });

      peer.on('connection', handleIncomingConnection);
    };

    const attemptHostSwitch = () => {
        if (customRoomId) return; 
        if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
        const hostId = `bitbrawl-room-${regionId}`;
        const peer = new Peer(hostId, { debug: 0 });
        peerRef.current = peer;
        peer.on('open', (id) => { if (!mountedRef.current) return; myIdRef.current = id; becomeHost(id); });
        peer.on('connection', handleIncomingConnection);
        peer.on('error', (err) => { if (err.type === 'unavailable-id') setTimeout(initPeer, 1500); });
    };

    const connectToHost = (hostId: string) => {
       if (!peerRef.current) return;
       setNetworkStatus(`Connecting to ${hostId}...`);
       const conn = peerRef.current.connect(hostId, { reliable: true });
       const failTimeout = setTimeout(() => { if (!conn.open && !customRoomId) { conn.close(); attemptHostSwitch(); } }, 4000);

       conn.on('open', () => {
          clearTimeout(failTimeout);
          setNetworkStatus("Connected");
          isHostRef.current = false;
          hostConnectionRef.current = conn;
          setRoomCodeDisplay(hostId);
          conn.send({ type: PacketType.JOIN, name: playerName, skin: skinConfig, loadout });
          conn.on('data', (data: any) => handlePacket(data));
          pingIntervalRef.current = window.setInterval(() => { if (conn.open) conn.send({ type: PacketType.PING, timestamp: Date.now() }); }, 1000);
       });
       conn.on('close', () => setNetworkStatus("Disconnected"));
       conn.on('error', () => { clearTimeout(failTimeout); if (!customRoomId) attemptHostSwitch(); });
    };

    const becomeHost = (id: string) => {
       setNetworkStatus("Hosting Match");
       isHostRef.current = true;
       playerRef.current = createPlayer('local', playerName, false, skinConfig, loadout);
       playerRef.current.role = PlayerRole.LEADER;
       setRoomCodeDisplay(id);
       
       if (!customRoomId) {
          spawnBot(); spawnBot(); spawnBot(); spawnBot();
          roundPhaseRef.current = RoundPhase.VOTING;
          roundTimeRef.current = CONFIG.VOTE_DURATION;
       } else {
          roundPhaseRef.current = RoundPhase.LOBBY_WAITING;
       }
       updateLobbyList();
    };

    const handleIncomingConnection = (conn: DataConnection) => {
       connectionsRef.current.set(conn.peer, conn);
       conn.on('data', (data: any) => {
          if (data.type === PacketType.JOIN) {
             const newPlayer = createPlayer(conn.peer, data.name, true, data.skin, data.loadout);
             newPlayer.role = (customRoomId === 'HOST') ? PlayerRole.GUEST : PlayerRole.LEADER;
             enemiesRef.current.set(conn.peer, newPlayer);
             conn.send({ type: PacketType.ROUND_SYNC, phase: roundPhaseRef.current, timeLeft: roundTimeRef.current, votes: Object.fromEntries(votesRef.current) });
             updateLobbyList();
          } else if (data.type === PacketType.INPUT) {
             handleClientInput(conn.peer, data);
          } else if (data.type === PacketType.VOTE) {
             if (roundPhaseRef.current === RoundPhase.VOTING) votesRef.current.set(data.mapId, (votesRef.current.get(data.mapId) || 0) + 1);
          } else if (data.type === PacketType.PING) {
             conn.send({ type: PacketType.PONG, timestamp: data.timestamp });
          } else if (data.type === PacketType.ACTION_USE) {
             const p = enemiesRef.current.get(conn.peer);
             if(p) {
                 if (data.action === 'GRENADE') useGrenade(p);
                 else if (data.action === 'ABILITY') useAbility(p);
             }
          } else if (data.type === PacketType.RELOAD) {
              const p = enemiesRef.current.get(conn.peer);
              if(p) reloadWeapon(p);
          }
       });
       conn.on('close', () => { enemiesRef.current.delete(conn.peer); connectionsRef.current.delete(conn.peer); updateLobbyList(); });
    };

    const handlePacket = (data: any) => {
        if (data.type === PacketType.STATE_UPDATE) handleStateUpdate(data);
        else if (data.type === PacketType.ROUND_SYNC) handleRoundSync(data);
        else if (data.type === PacketType.LOBBY_UPDATE) { setLobbyPlayers(data.players); currentModeRef.current = data.mode; }
        else if (data.type === PacketType.GAME_START) { currentModeRef.current = data.mode; roundPhaseRef.current = RoundPhase.VOTING; roundTimeRef.current = CONFIG.VOTE_DURATION; }
        else if (data.type === PacketType.PONG) setPing(Date.now() - data.timestamp);
    };

    initPeer();
    return () => { mountedRef.current = false; if(peerRef.current) peerRef.current.destroy(); clearInterval(pingIntervalRef.current); };
  }, [gameMode, customRoomId]);

  // --- LOGIC ---
  const updateLobbyList = () => {
      if (!isHostRef.current) return;
      const list = [];
      if (playerRef.current) list.push({ id: 'local', name: playerRef.current.name, role: playerRef.current.role });
      enemiesRef.current.forEach(p => list.push({ id: p.id, name: p.name, role: p.role }));
      const packet: LobbyUpdatePacket = { type: PacketType.LOBBY_UPDATE, players: list, mode: currentModeRef.current };
      setLobbyPlayers(list);
      connectionsRef.current.forEach(c => { if(c.open) c.send(packet); });
  };

  const createPlayer = (id: string, name: string, isRemote: boolean, skin: SkinConfig, loadout: LoadoutConfig): Player => ({
        id, name, pos: { x: 1000, y: 1000 }, velocity: { x: 0, y: 0 }, radius: CONFIG.PLAYER_RADIUS,
        color: skin.color, skin, loadout, hp: 100, maxHp: 100, score: 0, kills: 0, deaths: 0, weaponIndex: 0, level: 1, xp: 0,
        weapon: loadout.primary, lastFired: 0, lastGrenade: 0, lastAbility: 0, activeAbility: null, abilityActiveUntil: 0, 
        clipAmmo: WEAPON_STATS[loadout.primary].clipSize, isReloading: false, reloadEndTime: 0,
        angle: 0, isBot: false, dashCooldown: 0, animFrame: 0, isRemote, role: PlayerRole.GUEST,
        ammo: currentModeRef.current === GameMode.ONE_IN_CHAMBER ? 1 : 100, speed: CONFIG.PLAYER_SPEED
  });

  const spawnBot = () => {
    if (customRoomId && Array.from(enemiesRef.current.values()).length >= 1) return;
    if (Array.from(enemiesRef.current.values()).length >= 12) return;
    
    const id = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const randomSkin = {
        color: COSMETICS.colors[Math.floor(Math.random()*COSMETICS.colors.length)].id,
        hat: COSMETICS.hats[Math.floor(Math.random()*COSMETICS.hats.length)].id,
        eyes: COSMETICS.eyes[Math.floor(Math.random()*COSMETICS.eyes.length)].id,
        clothes: COSMETICS.clothes[Math.floor(Math.random()*COSMETICS.clothes.length)].id
    };
    const randomLoadout = {
        primary: WEAPON_PROGRESSION[Math.floor(Math.random() * 5)], // Start with basic guns
        grenade: Object.values(GrenadeType)[Math.floor(Math.random() * 4)],
        ability: Object.values(AbilityType)[Math.floor(Math.random() * 5)]
    };

    const bot = createPlayer(id, BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], false, randomSkin, randomLoadout);
    bot.isBot = true;
    enemiesRef.current.set(id, bot);
  };

  const initializeSpectatorMode = () => { isHostRef.current = true; for(let i=0; i<8; i++) spawnBot(); roundPhaseRef.current = RoundPhase.FIGHTING; };

  const handleStateUpdate = (packet: StatePacket) => {
    const me = packet.players.find(p => p.id === myIdRef.current);
    if (me && playerRef.current) {
         playerRef.current.hp = me.hp; playerRef.current.score = me.score; playerRef.current.kills = me.kills;
         playerRef.current.weapon = me.weapon; playerRef.current.weaponIndex = me.weaponIndex; playerRef.current.ammo = me.ammo;
         playerRef.current.lastAbility = me.lastAbility; playerRef.current.lastGrenade = me.lastGrenade;
         playerRef.current.clipAmmo = me.clipAmmo; playerRef.current.isReloading = me.isReloading;
         playerRef.current.team = me.team;
         if (Math.hypot(me.pos.x - playerRef.current.pos.x, me.pos.y - playerRef.current.pos.y) > 150) playerRef.current.pos = me.pos; 
         if (me.hp < playerRef.current.hp) { shake(5); sfx.playHit(); }
    } else if (me && !playerRef.current) { playerRef.current = me; }

    const currentIds = new Set<string>();
    packet.players.forEach(p => {
       if (p.id === myIdRef.current) return;
       currentIds.add(p.id);
       const existing = enemiesRef.current.get(p.id);
       if (existing) {
          existing.pos.x += (p.pos.x - existing.pos.x) * 0.3; existing.pos.y += (p.pos.y - existing.pos.y) * 0.3;
          existing.angle = p.angle; existing.hp = p.hp; existing.weapon = p.weapon; existing.skin = p.skin; existing.team = p.team;
          existing.isReloading = p.isReloading;
       } else { enemiesRef.current.set(p.id, p); }
    });
    for (const id of enemiesRef.current.keys()) { if (!currentIds.has(id)) enemiesRef.current.delete(id); }
    bulletsRef.current = packet.bullets;
  };

  const handleRoundSync = (packet: RoundSyncPacket) => {
     setRoundInfo({ phase: packet.phase, time: packet.timeLeft, votes: packet.votes || {} });
     roundPhaseRef.current = packet.phase;
     if (packet.phase === RoundPhase.FIGHTING) hasVotedRef.current = false; 
  };

  const handleClientInput = (playerId: string, packet: InputPacket) => {
    const p = enemiesRef.current.get(playerId);
    if (!p) return;
    const acc = { x: 0, y: 0 };
    if (packet.keys.includes('KeyW')) acc.y -= 1; if (packet.keys.includes('KeyS')) acc.y += 1;
    if (packet.keys.includes('KeyA')) acc.x -= 1; if (packet.keys.includes('KeyD')) acc.x += 1;
    if (acc.x !== 0 || acc.y !== 0) {
       const len = Math.sqrt(acc.x*acc.x + acc.y*acc.y);
       p.velocity.x += (acc.x/len) * 0.8; p.velocity.y += (acc.y/len) * 0.8; p.animFrame += 0.2;
    }
    p.angle = packet.angle; p.isRemoteFiring = packet.keys.includes('MouseLeft');
  };

  // --- LOOP ---
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d', { alpha: false });
    if (!ctx) return;
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; }};
    window.addEventListener('resize', handleResize); handleResize();

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
            if (showSettings) {
                setShowSettings(false);
            } else {
                setIsPaused(prev => !prev);
            }
        }
        
        keysRef.current.add(e.code);
        
        // Prevent actions if paused
        if (isPaused) return;

        if (e.code === 'KeyG') {
            if (isHostRef.current && playerRef.current) useGrenade(playerRef.current);
            else if (hostConnectionRef.current) hostConnectionRef.current.send({ type: PacketType.ACTION_USE, action: 'GRENADE' });
        }
        if (e.code === 'KeyE') {
            if (isHostRef.current && playerRef.current) useAbility(playerRef.current);
            else if (hostConnectionRef.current) hostConnectionRef.current.send({ type: PacketType.ACTION_USE, action: 'ABILITY' });
        }
        if (e.code === 'KeyR') {
            if (isHostRef.current && playerRef.current) reloadWeapon(playerRef.current);
            else if (hostConnectionRef.current) hostConnectionRef.current.send({ type: PacketType.RELOAD });
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvasRef.current?.getBoundingClientRect();
       if(rect) mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseDown = () => {
        if (!isPaused) keysRef.current.add('MouseLeft');
    };
    const handleMouseUp = () => keysRef.current.delete('MouseLeft');

    if (mode === 'play') {
      window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mousedown', handleMouseDown); window.addEventListener('mouseup', handleMouseUp);
    }

    let loopId: number;
    const loop = () => {
      if (!canvasRef.current) return;
      frameRef.current++;
      
      // Decay
      if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      if (particlesRef.current.length > CONFIG.MAX_PARTICLES) particlesRef.current.splice(0, particlesRef.current.length - CONFIG.MAX_PARTICLES);

      if (mode === 'play' && !isHostRef.current && hostConnectionRef.current?.open && frameRef.current % 3 === 0) {
         const center = { x: window.innerWidth/2, y: window.innerHeight/2 };
         const angle = Math.atan2(mouseRef.current.y - center.y, mouseRef.current.x - center.x);
         hostConnectionRef.current.send({ type: PacketType.INPUT, keys: Array.from(keysRef.current), angle });
         if (playerRef.current) playerRef.current.angle = angle;
      }

      if (isHostRef.current) {
        if (frameRef.current % 60 === 0 && roundPhaseRef.current !== RoundPhase.LOBBY_WAITING) {
           roundTimeRef.current -= 1;
           if (roundPhaseRef.current === RoundPhase.VOTING && roundTimeRef.current <= 0) {
              // START GAME
              let winner = availableMapsRef.current[Math.floor(Math.random()*availableMapsRef.current.length)];
              let maxVotes = -1;
              votesRef.current.forEach((count, map) => { if (count > maxVotes) { maxVotes = count; winner = map; }});
              generateMap(winner);
              
              const all = [playerRef.current, ...Array.from(enemiesRef.current.values())].filter(p => !!p);
              let teamToggle = 0;
              
              all.forEach(p => {
                 p.hp = p.maxHp; p.pos = { x: randomRange(200, CONFIG.MAP_WIDTH-200), y: randomRange(200, CONFIG.MAP_HEIGHT-200) };
                 p.score = 0; p.kills = 0; p.weaponIndex = 0; p.speed = CONFIG.PLAYER_SPEED;
                 p.activeAbility = null; p.abilityActiveUntil = 0;
                 
                 if (currentModeRef.current === GameMode.TDM) {
                    p.team = teamToggle % 2 === 0 ? 'RED' : 'BLUE';
                    p.skin.color = p.team === 'RED' ? '#ef4444' : '#3b82f6';
                    teamToggle++;
                 } else if (currentModeRef.current === GameMode.GUN_GAME) {
                    p.weapon = WEAPON_PROGRESSION[0];
                 } else if (currentModeRef.current === GameMode.ONE_IN_CHAMBER) {
                    p.weapon = WeaponType.REVOLVER;
                    p.maxHp = 100; p.hp = 100; p.ammo = 1;
                 } else if (currentModeRef.current === GameMode.ZOMBIES) {
                    p.team = 'SURVIVOR';
                    p.weapon = p.isBot ? WeaponType.SMG : p.loadout.primary;
                 } else {
                    p.weapon = p.isBot ? WeaponType.ASSAULT_RIFLE : p.loadout.primary;
                 }
                 p.clipAmmo = WEAPON_STATS[p.weapon].clipSize;
                 bulletsRef.current = [];
              });
              
              if (currentModeRef.current === GameMode.ZOMBIES && all.length > 0) {
                 const zombie = all[Math.floor(Math.random()*all.length)];
                 zombie.team = 'ZOMBIE'; zombie.skin.color = '#10b981'; zombie.speed = CONFIG.PLAYER_SPEED * 1.3; zombie.weapon = WeaponType.KNIFE;
              }

              roundPhaseRef.current = RoundPhase.FIGHTING;
              roundTimeRef.current = CONFIG.ROUND_DURATION;
           } else if (roundPhaseRef.current === RoundPhase.FIGHTING && roundTimeRef.current <= 0) {
              roundPhaseRef.current = RoundPhase.VOTING; roundTimeRef.current = CONFIG.VOTE_DURATION; votesRef.current.clear();
           }
           const sync: RoundSyncPacket = { type: PacketType.ROUND_SYNC, phase: roundPhaseRef.current, timeLeft: roundTimeRef.current, votes: Object.fromEntries(votesRef.current) };
           connectionsRef.current.forEach(c => { if(c.open) c.send(sync); });
           handleRoundSync(sync);
        }
        if (roundPhaseRef.current === RoundPhase.FIGHTING || roundPhaseRef.current === RoundPhase.LOBBY_WAITING) updateGameLogic();
      }

      renderGame(ctx, canvasRef.current!);
      loopId = requestAnimationFrame(loop);
    };

    const updateGameLogic = () => {
        const allPlayers = [playerRef.current, ...Array.from(enemiesRef.current.values())].filter(p => !!p) as Player[];
        if (!customRoomId && roundPhaseRef.current === RoundPhase.FIGHTING && allPlayers.length < 8 && frameRef.current % 120 === 0) spawnBot();

        allPlayers.forEach(p => {
          if (p.hp <= 0) return;
          
          // --- Ability State Update ---
          if (p.activeAbility && Date.now() > p.abilityActiveUntil) {
              p.activeAbility = null;
              if (p.loadout.ability === AbilityType.BERSERK) p.speed = CONFIG.PLAYER_SPEED;
          }
          if (p.activeAbility === AbilityType.BERSERK) p.speed = CONFIG.PLAYER_SPEED * 1.4;
          else p.speed = CONFIG.PLAYER_SPEED;
          if (p.activeAbility === AbilityType.CLOAK) { /* Logic in render */ }

          // --- Reload Logic ---
          if (p.isReloading) {
              if (Date.now() >= p.reloadEndTime) {
                  p.isReloading = false;
                  p.clipAmmo = WEAPON_STATS[p.weapon].clipSize;
              }
          }

          let acc = { x: 0, y: 0 };
          let firing = false;
          
          if (p.id === 'local') {
             if (keysRef.current.has('KeyW')) acc.y -= 1; if (keysRef.current.has('KeyS')) acc.y += 1;
             if (keysRef.current.has('KeyA')) acc.x -= 1; if (keysRef.current.has('KeyD')) acc.x += 1;
             // Input blocked by Pause Menu
             firing = !isPaused && keysRef.current.has('MouseLeft');
             if (keysRef.current.has('Space') && p.dashCooldown <= 0 && !isPaused) {
                p.velocity.x += acc.x * 20; p.velocity.y += acc.y * 20; p.dashCooldown = 60;
                createExplosion(p.pos, '#fff', 3);
             }
             p.angle = Math.atan2(mouseRef.current.y - (p.pos.y - camRef.current.y), mouseRef.current.x - (p.pos.x - camRef.current.x));
          } else if (p.isBot) {
             // --- SMART AI ---
             let target = allPlayers.find(t => t.id === p.botTargetId);
             
             // Retarget if invalid or dead
             if (!target || target.hp <= 0 || target.id === p.id || (p.team && target.team === p.team)) {
                 const potentialTargets = allPlayers.filter(t => t.id !== p.id && t.hp > 0 && (!p.team || t.team !== p.team));
                 if (potentialTargets.length > 0) {
                     target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                     p.botTargetId = target.id;
                 } else {
                     p.botTargetId = null;
                 }
             }

             if (target) {
                const dist = Math.hypot(target.pos.x - p.pos.x, target.pos.y - p.pos.y);
                const idealAngle = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x);
                
                // Smooth aim
                let angleDiff = idealAngle - p.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                p.angle += angleDiff * 0.15; // Turn speed

                const range = (p.team === 'ZOMBIE') ? 30 : WEAPON_STATS[p.weapon].range * 0.7;
                
                // Movement
                if (dist > range) { acc.x += Math.cos(p.angle); acc.y += Math.sin(p.angle); }
                else if (p.team !== 'ZOMBIE' && dist < range * 0.4) { acc.x -= Math.cos(p.angle); acc.y -= Math.sin(p.angle); }
                else { 
                   // Strafe
                   acc.x += Math.cos(p.angle + Math.PI/2) * (Math.sin(frameRef.current * 0.05));
                   acc.y += Math.sin(p.angle + Math.PI/2) * (Math.sin(frameRef.current * 0.05));
                }

                // AI Actions
                if (dist < range * 1.5 && Math.abs(angleDiff) < 0.5) firing = true;
                if (Math.random() < 0.005) useGrenade(p);
                if (Math.random() < 0.002) useAbility(p);
             } else {
                 // Wander if no target
                 if (frameRef.current % 100 === 0) p.targetAngle = Math.random() * Math.PI * 2;
                 if (p.targetAngle) {
                     p.angle = lerp(p.angle, p.targetAngle, 0.05);
                     acc.x += Math.cos(p.angle) * 0.5; acc.y += Math.sin(p.angle) * 0.5;
                 }
             }
          } else if (p.isRemoteFiring) { firing = true; }

          if (acc.x !== 0 || acc.y !== 0) {
             const len = Math.sqrt(acc.x*acc.x + acc.y*acc.y);
             const speed = p.speed || CONFIG.PLAYER_SPEED;
             p.velocity.x += (acc.x/len) * 0.8 * (speed/CONFIG.PLAYER_SPEED); 
             p.velocity.y += (acc.y/len) * 0.8 * (speed/CONFIG.PLAYER_SPEED); 
             p.animFrame += 0.2;
          }
          
          if (firing) {
              if (p.clipAmmo > 0 && !p.isReloading) fireWeapon(p);
              else if (p.clipAmmo <= 0 && !p.isReloading && WEAPON_STATS[p.weapon].reloadTime > 0) reloadWeapon(p);
          }
          
          if (p.dashCooldown > 0) p.dashCooldown--;
          p.velocity.x *= CONFIG.FRICTION; p.velocity.y *= CONFIG.FRICTION;
          p.pos.x += p.velocity.x; p.pos.y += p.velocity.y;
          resolveWallCollision(p);
          p.pos.x = Math.max(p.radius, Math.min(CONFIG.MAP_WIDTH - p.radius, p.pos.x));
          p.pos.y = Math.max(p.radius, Math.min(CONFIG.MAP_HEIGHT - p.radius, p.pos.y));

          // Zombies Logic
          if (currentModeRef.current === GameMode.ZOMBIES && p.team === 'ZOMBIE') {
             allPlayers.forEach(survivor => {
                if (survivor.team === 'SURVIVOR' && checkCircleRect({x: p.pos.x, y: p.pos.y, r: p.radius}, {x: survivor.pos.x-20, y: survivor.pos.y-20, width: 40, height: 40})) {
                   survivor.team = 'ZOMBIE'; survivor.skin.color = '#10b981'; survivor.weapon = WeaponType.KNIFE; survivor.speed = CONFIG.PLAYER_SPEED * 1.3;
                   createExplosion(survivor.pos, '#10b981', 10);
                   sfx.playKill();
                }
             });
          }
        });

        updateBullets(allPlayers);
        if (frameRef.current % 3 === 0) connectionsRef.current.forEach(conn => { if(conn.open) conn.send({ type: PacketType.STATE_UPDATE, players: allPlayers, bullets: bulletsRef.current, timestamp: Date.now() }); });
    };

    const fireWeapon = (shooter: Player) => {
       let stats = WEAPON_STATS[shooter.weapon];
       let isMelee = stats.isMelee;
       
       // One in chamber infinite melee override or knife fallback
       if (currentModeRef.current === GameMode.ONE_IN_CHAMBER && (shooter.ammo || 0) <= 0) {
           isMelee = true; stats = WEAPON_STATS[WeaponType.KNIFE]; 
       }

       const now = Date.now();
       if (now - shooter.lastFired > stats.cooldown * (1000/60)) {
           shooter.lastFired = now;
           
           if (!isMelee) {
              if (currentModeRef.current === GameMode.ONE_IN_CHAMBER) shooter.ammo = (shooter.ammo || 1) - 1;
              shooter.clipAmmo--;
           }

           if(shooter.id === 'local' || (playerRef.current && Math.hypot(playerRef.current.pos.x - shooter.pos.x, playerRef.current.pos.y - shooter.pos.y) < 800)) {
               sfx.playShoot(isMelee ? 'pistol' : shooter.weapon === WeaponType.SHOTGUN ? 'shotgun' : shooter.weapon === WeaponType.LASER ? 'laser' : 'pistol');
           }

           // Berserk buff
           const dmgMult = (shooter.activeAbility === AbilityType.BERSERK) ? 1.5 : 1.0;

           if (isMelee) {
               bulletsRef.current.push({ id: Math.random().toString(), ownerId: shooter.id, type: 'BULLET', pos: {...shooter.pos}, velocity: {x: Math.cos(shooter.angle)*10, y: Math.sin(shooter.angle)*10}, damage: 50 * dmgMult, radius: 10, color: 'rgba(255,255,255,0.5)', life: 5 });
           } else {
               for(let i=0; i< stats.count; i++) {
                 const spread = (Math.random() - 0.5) * stats.spread;
                 bulletsRef.current.push({
                   id: Math.random().toString(), ownerId: shooter.id, type: 'BULLET',
                   pos: { x: shooter.pos.x + Math.cos(shooter.angle)*30, y: shooter.pos.y + Math.sin(shooter.angle)*30 },
                   velocity: { x: Math.cos(shooter.angle + spread) * stats.speed, y: Math.sin(shooter.angle + spread) * stats.speed },
                   damage: stats.damage * dmgMult, radius: 5, color: stats.color, life: stats.range
                 });
               }
           }
       }
    };

    const updateBullets = (allPlayers: Player[]) => {
       for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const b = bulletsRef.current[i];
          
          if (b.type === 'GRENADE') {
              b.pos.x += b.velocity.x; b.pos.y += b.velocity.y;
              b.velocity.x *= 0.95; b.velocity.y *= 0.95; // Friction
              b.life--;
              // Bounce
              for(const obs of obstaclesRef.current) {
                  if (obs.collidable && checkCircleRect({x: b.pos.x, y: b.pos.y, r: b.radius}, obs)) {
                      b.velocity.x *= -0.8; b.velocity.y *= -0.8; 
                  }
              }
              if (b.life <= 0) {
                  // Explode
                  createExplosion(b.pos, '#fbbf24', 20);
                  sfx.playExplosion();
                  const stats = GRENADE_STATS[b.grenadeType!];
                  allPlayers.forEach(p => {
                      if (Math.hypot(p.pos.x - b.pos.x, p.pos.y - b.pos.y) < stats.radius) {
                          if (p.activeAbility === AbilityType.SHIELD) return; // Block damage
                          p.hp -= stats.damage;
                          if (p.hp <= 0 && b.ownerId === 'local' && isHostRef.current) {
                              const killer = allPlayers.find(k => k.id === b.ownerId);
                              if(killer) { killer.score+=50; killer.kills++; }
                          }
                      }
                  });
                  bulletsRef.current.splice(i, 1);
              }
              continue;
          }

          b.pos.x += b.velocity.x; b.pos.y += b.velocity.y; b.life--;
          let hit = false;
          for(const obs of obstaclesRef.current) {
             if (obs.collidable && checkCircleRect({x: b.pos.x, y: b.pos.y, r: b.radius}, obs)) {
                hit = true; createExplosion(b.pos, '#fff', 2); break;
             }
          }
          if (!hit) {
             for (const p of allPlayers) {
                if (b.ownerId === p.id || p.hp <= 0) continue;
                if (currentModeRef.current === GameMode.TDM && p.team === allPlayers.find(pl => pl.id === b.ownerId)?.team) continue;
                if (currentModeRef.current === GameMode.ZOMBIES && p.team === 'ZOMBIE') continue; 

                if ((p.pos.x - b.pos.x)**2 + (p.pos.y - b.pos.y)**2 < (p.radius + b.radius)**2) {
                   hit = true; 
                   const killer = allPlayers.find(k => k.id === b.ownerId);
                   
                   let dmg = b.damage;
                   // Shield blocks bullets
                   if (p.activeAbility === AbilityType.SHIELD) dmg = 0;
                   if (currentModeRef.current === GameMode.ONE_IN_CHAMBER && b.life > 5 && dmg > 0) dmg = 100;

                   if (dmg > 0) {
                      p.hp -= dmg; 
                      createExplosion(b.pos, p.skin.color, 4);
                   } else {
                      createExplosion(b.pos, '#3b82f6', 4); // Shield hit effect
                   }
                   
                   if (p.hp <= 0) {
                      createExplosion(p.pos, p.skin.color, 12);
                      if (killer) {
                          killer.score += 100; killer.kills += 1; killer.hp = Math.min(killer.hp + 50, killer.maxHp);
                          if (killer.id === 'local') { setKillNotification({ text: `ELIMINATED ${p.name.toUpperCase()}`, timestamp: Date.now() }); sfx.playKill(); }

                          if (currentModeRef.current === GameMode.GUN_GAME) {
                              killer.weaponIndex = (killer.weaponIndex + 1);
                              if (killer.weaponIndex >= WEAPON_PROGRESSION.length) { if (killer.id === 'local') onGameOver(killer.score); killer.weaponIndex = 0; }
                              killer.weapon = WEAPON_PROGRESSION[killer.weaponIndex];
                              killer.clipAmmo = WEAPON_STATS[killer.weapon].clipSize; // Refill on upgrade
                          } else if (currentModeRef.current === GameMode.ONE_IN_CHAMBER) {
                              killer.ammo = (killer.ammo || 0) + 1;
                          }
                      }
                      
                      if (currentModeRef.current === GameMode.ONE_IN_CHAMBER) {
                          if (p.id === 'local') onGameOver(p.score); 
                          else if (p.isBot) enemiesRef.current.delete(p.id);
                      } else {
                          p.hp = p.maxHp; p.pos = { x: randomRange(200, 1800), y: randomRange(200, 1800) };
                          p.clipAmmo = WEAPON_STATS[p.weapon].clipSize;
                          p.isReloading = false;
                      }
                   }
                   break;
                }
             }
          }
          if (hit || b.life <= 0) bulletsRef.current.splice(i, 1);
       }
    };

    const renderGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
       sfx.setVolume(settings.masterVolume, settings.sfxVolume);
       let target = playerRef.current;
       if (mode === 'spectate' || !target) { const others = Array.from(enemiesRef.current.values()); if (others.length > 0) target = others[0]; }
       
       if (target) {
         const tx = target.pos.x - canvas.width / 2;
         const ty = target.pos.y - canvas.height / 2;
         camRef.current.x += (tx - camRef.current.x) * 0.1;
         camRef.current.y += (ty - camRef.current.y) * 0.1;
       }

       ctx.save();
       const shakeX = (Math.random() - 0.5) * screenShakeRef.current * 10;
       const shakeY = (Math.random() - 0.5) * screenShakeRef.current * 10;
       ctx.translate(-Math.floor(camRef.current.x) + shakeX, -Math.floor(camRef.current.y) + shakeY);

       // Draw Grid
       const startX = Math.floor(camRef.current.x / 100) * 100;
       const startY = Math.floor(camRef.current.y / 100) * 100;
       const endX = startX + canvas.width + 100;
       const endY = startY + canvas.height + 100;
       
       ctx.fillStyle = themeRef.current.background;
       ctx.fillRect(startX, startY, endX - startX, endY - startY);

       ctx.fillStyle = themeRef.current.detailColor;
       for (let x = startX; x < endX; x += 100) {
          for (let y = startY; y < endY; y += 100) {
             ctx.fillRect(x + 10, y + 10, 80, 80);
          }
       }

       obstaclesRef.current.forEach(obs => {
         if (obs.x + obs.width < startX || obs.x > endX || obs.y + obs.height < startY || obs.y > endY) return;
         if (obs.type === ObstacleType.FLOOR_DETAIL) {
             ctx.fillStyle = obs.color; ctx.globalAlpha = 0.5; ctx.fillRect(obs.x, obs.y, obs.width, obs.height); ctx.globalAlpha = 1.0;
         } else {
             ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(obs.x + 10, obs.y + 10, obs.width, obs.height); 
             ctx.fillStyle = obs.color; ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
             ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
         }
       });

       const allToRender = [playerRef.current, ...Array.from(enemiesRef.current.values())].filter(p => !!p && p.hp > 0);
       allToRender.sort((a,b) => a.pos.y - b.pos.y);

       allToRender.forEach(p => {
          if (p.activeAbility === AbilityType.CLOAK && p.id !== 'local') return; // Invisible

          ctx.save(); 
          ctx.translate(p.pos.x, p.pos.y); 
          
          if (p.activeAbility === AbilityType.CLOAK) ctx.globalAlpha = 0.5;
          
          ctx.rotate(p.angle); // Rotate context to player aim
          
          // Ability Effects
          if (p.activeAbility === AbilityType.SHIELD) {
              ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.stroke();
          }
          if (p.activeAbility === AbilityType.BERSERK) {
              ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
          }

          // Legs
          const footOffset = Math.sin(p.animFrame) * 5;
          ctx.fillStyle = '#1f2937'; 
          ctx.fillRect(-10 + footOffset, 10, 10, 10); 
          ctx.fillRect(-10 - footOffset, -20, 10, 10); 
          
          // Body
          ctx.fillStyle = p.skin.color; 
          ctx.lineWidth = 2; ctx.strokeStyle = '#000'; 
          ctx.beginPath(); ctx.rect(-15, -15, 30, 30); ctx.fill(); ctx.stroke();
          
          // Clothes Logic (Simple)
          if (p.skin.clothes === 'suit') { ctx.fillStyle = '#111'; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = 'red'; ctx.fillRect(-2, -5, 4, 10); }

          // Backpack
          ctx.fillStyle = '#111'; ctx.fillRect(-20, -10, 5, 20); 

          // Weapon
          if (p.team !== 'ZOMBIE') {
             ctx.fillStyle = WEAPON_STATS[p.weapon].color; 
             const wLen = WEAPON_STATS[p.weapon].isMelee ? 15 : 25;
             ctx.fillRect(10, 5, wLen, 6);
          }

          // Eyes
          ctx.fillStyle = '#fff'; ctx.fillRect(5, -8, 6, 6); ctx.fillRect(5, 2, 6, 6);
          ctx.fillStyle = '#000'; ctx.fillRect(8, -6, 2, 2); ctx.fillRect(8, 4, 2, 2);

          // Hats
          ctx.fillStyle = '#fbbf24';
          if (p.skin.hat === 'crown') ctx.fillRect(-14, -20, 28, 6);

          ctx.restore();
          
          // HUD: Reload Bar
          if (p.isReloading) {
             const reloadPct = 1 - (p.reloadEndTime - Date.now()) / WEAPON_STATS[p.weapon].reloadTime;
             ctx.fillStyle = '#4b5563'; ctx.fillRect(p.pos.x - 20, p.pos.y - 45, 40, 4);
             ctx.fillStyle = '#fbbf24'; ctx.fillRect(p.pos.x - 20, p.pos.y - 45, 40 * Math.max(0, Math.min(1, reloadPct)), 4);
          }

          // HUD: HP
          ctx.fillStyle = '#000'; ctx.fillRect(p.pos.x - 20, p.pos.y - 35, 40, 6);
          ctx.fillStyle = p.team === 'RED' ? '#ef4444' : p.team === 'BLUE' ? '#3b82f6' : p.team === 'ZOMBIE' ? '#10b981' : '#fbbf24';
          ctx.fillRect(p.pos.x - 20, p.pos.y - 35, 40 * (p.hp / p.maxHp), 6);
          
          // Name
          ctx.fillStyle = '#fff'; ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillText(p.name, p.pos.x, p.pos.y - 50);
       });

       bulletsRef.current.forEach(b => { 
           if(b.type === 'GRENADE') {
               ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI*2); ctx.fill();
               // Fuse
               ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); 
               ctx.arc(b.pos.x, b.pos.y, b.radius + 4, 0, (b.life / (b.maxLife||60)) * Math.PI*2); ctx.stroke();
           } else {
               ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI*2); ctx.fill(); 
           }
       });
       particlesRef.current.forEach(p => { p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.life--; ctx.globalAlpha = p.life / 20; ctx.fillStyle = p.color; ctx.fillRect(p.pos.x, p.pos.y, p.size, p.size); ctx.globalAlpha = 1.0; });

       ctx.restore();
    };

    loopId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(loopId); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('resize', handleResize); };
  }, [mode, playerName, onGameOver, isPaused]);

  // HUD Update Effect
  useEffect(() => {
     if (mode === 'play' && playerRef.current) {
        const interval = setInterval(() => {
           const p = playerRef.current!;
           setHudState({ 
               hp: p.hp, maxHp: p.maxHp, score: p.score, weapon: p.weapon, 
               dashReady: p.dashCooldown <= 0, kills: p.kills, weaponIndex: p.weaponIndex, ammo: p.ammo || 0,
               abilityReady: (Date.now() - p.lastAbility) > ABILITY_STATS[p.loadout.ability].cooldown,
               abilityCooldown: (Date.now() - p.lastAbility),
               grenadeReady: (Date.now() - p.lastGrenade) > GRENADE_STATS[p.loadout.grenade].cooldown,
               grenadeCooldown: (Date.now() - p.lastGrenade),
               clipAmmo: p.clipAmmo, maxClip: WEAPON_STATS[p.weapon].clipSize,
               isReloading: p.isReloading, reloadProgress: p.isReloading ? (1 - (p.reloadEndTime - Date.now()) / WEAPON_STATS[p.weapon].reloadTime) * 100 : 0
            });
           
           // Correct Leaderboard Data Source
           const all = [p, ...Array.from(enemiesRef.current.values())];
           setLeaderboard(all.sort((a,b) => b.score - a.score).slice(0, 5).map(pl => ({ name: pl.name, score: Math.floor(pl.score), kills: pl.kills, weapon: pl.weapon, team: pl.team })));
        }, 100);
        return () => clearInterval(interval);
     }
  }, [mode]);
  
  useEffect(() => { if (killNotification) { const timer = setTimeout(() => setKillNotification(null), 2000); return () => clearTimeout(timer); } }, [killNotification]);

  if (mode === 'spectate') return <canvas ref={canvasRef} className="block w-full h-full" />;

  const formatTime = (s: number) => { const mins = Math.floor(s / 60); const secs = Math.floor(s % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; };

  return (
    <>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Layer */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Top Info */}
        <div className="absolute top-4 left-4 flex flex-col gap-1">
          <div className="bg-black/60 px-3 py-1 rounded text-[10px] text-green-400 font-mono border border-green-900">STATUS: {networkStatus} {isHostRef.current ? '[HOST]' : '[CLIENT]'}</div>
          <div className="bg-black/60 px-3 py-1 rounded text-[10px] text-yellow-400 font-mono border border-yellow-900">PING: {ping}ms</div>
        </div>

        {/* Round Timer */}
        {roundPhaseRef.current !== RoundPhase.LOBBY_WAITING && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
             <div className={`px-4 py-2 rounded border-2 font-pixel text-xl ${roundInfo.phase === RoundPhase.VOTING ? 'bg-red-900 border-red-500 text-red-200 animate-pulse' : 'bg-gray-800 border-gray-600 text-white'}`}>
                {roundInfo.phase === RoundPhase.VOTING ? 'VOTE NEXT MAP' : formatTime(roundInfo.time)}
             </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="absolute top-4 right-4 bg-black/60 p-3 rounded text-white font-pixel text-[10px] min-w-[200px] border border-gray-700">
          <h3 className="text-yellow-400 mb-2 border-b border-gray-600 pb-1 flex justify-between"><span>LEADERBOARD</span><Trophy size={10} /></h3>
          {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
            <div key={i} className="flex justify-between items-center mb-2">
              <span className={`${entry.name === playerName ? 'text-green-400' : 'text-gray-300'} ${entry.team === 'RED' ? 'text-red-400' : entry.team === 'BLUE' ? 'text-blue-400' : entry.team === 'ZOMBIE' ? 'text-green-500' : ''}`}>
                 {i+1}. {entry.name.slice(0, 10)}
              </span>
              <div className="flex gap-3 text-right">
                  <span className="text-red-400 flex items-center gap-1">{entry.kills} <Skull size={8}/></span>
                  <span className="text-yellow-500">{entry.score}</span>
              </div>
            </div>
          )) : <div className="text-gray-500 italic">Waiting...</div>}
        </div>

        {/* Kill Notification */}
        {killNotification && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="bg-red-900/80 border-2 border-red-500 px-6 py-2 rounded skew-x-[-10deg]">
                    <h2 className="text-red-100 font-pixel text-lg skew-x-[10deg] drop-shadow-md">{killNotification.text}</h2>
                </div>
            </div>
        )}

        {/* Bottom Bar: Ammo, Health & Abilities */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl flex flex-col items-center gap-2">
           {/* Reload Bar */}
           {hudState.isReloading && (
               <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600 mb-2">
                   <div className="h-full bg-yellow-500 transition-all duration-75" style={{width: `${hudState.reloadProgress}%`}}/>
               </div>
           )}

           <div className="flex items-center gap-4 w-full justify-center">
               {/* Grenade */}
               <div className="relative group">
                   <div className={`w-12 h-12 border-4 bg-gray-900 flex items-center justify-center transform skew-x-[-10deg] ${hudState.grenadeReady ? 'border-red-500' : 'border-gray-700'}`}>
                       <Bomb size={20} className={hudState.grenadeReady ? 'text-red-400' : 'text-gray-600'} />
                       <span className="absolute top-0 right-1 text-[8px] font-pixel text-white">G</span>
                       {!hudState.grenadeReady && <div className="absolute inset-0 bg-black/60 flex items-end justify-center"><div className="w-full bg-red-500" style={{height: `${Math.min(100, (hudState.grenadeCooldown / 8000) * 100)}%`}}/></div>}
                   </div>
               </div>

               {/* Health Bar */}
               <div className="flex-1 bg-gray-900 border-4 border-gray-700 h-12 relative skew-x-[-10deg] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200" style={{ width: `${(hudState.hp / hudState.maxHp) * 100}%`}} />
                  <span className="absolute inset-0 flex items-center justify-center font-pixel text-lg text-white drop-shadow-md skew-x-[10deg]">{Math.ceil(hudState.hp)} HP</span>
               </div>

               {/* Ammo / Weapon */}
               <div className="bg-gray-800 p-2 border-2 border-gray-600 text-white font-pixel min-w-[120px] text-center skew-x-[-10deg] flex flex-col justify-center">
                  <div className="text-[10px] text-gray-400 skew-x-[10deg]">{hudState.weapon}</div>
                  <div className={`text-xl font-bold skew-x-[10deg] ${hudState.clipAmmo === 0 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                      {hudState.isReloading ? 'RELOAD' : `${hudState.clipAmmo}/${hudState.maxClip}`}
                  </div>
               </div>

               {/* Ability */}
               <div className="relative group">
                   <div className={`w-12 h-12 border-4 bg-gray-900 flex items-center justify-center transform skew-x-[-10deg] ${hudState.abilityReady ? 'border-blue-500' : 'border-gray-700'}`}>
                       <Zap size={20} className={hudState.abilityReady ? 'text-blue-400' : 'text-gray-600'} />
                       <span className="absolute top-0 right-1 text-[8px] font-pixel text-white">E</span>
                       {!hudState.abilityReady && <div className="absolute inset-0 bg-black/60 flex items-end justify-center"><div className="w-full bg-blue-500" style={{height: `${Math.min(100, (hudState.abilityCooldown / 15000) * 100)}%`}}/></div>}
                   </div>
               </div>
           </div>
        </div>
      </div>
      
      {/* PAUSE MENU OVERLAY */}
      {isPaused && !showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center pointer-events-auto cursor-auto">
           <h2 className="font-pixel text-3xl text-white mb-8">PAUSED</h2>
           <div className="flex flex-col gap-4 w-64">
              <button onClick={() => { sfx.playClick(); setIsPaused(false); }} className="bg-green-600 hover:bg-green-500 text-white font-pixel py-4 rounded border-b-4 border-green-800 active:border-b-0 active:mt-1 flex items-center justify-center gap-2">
                 <Play size={20}/> RESUME
              </button>
              <button onClick={() => { sfx.playClick(); setShowSettings(true); }} className="bg-gray-700 hover:bg-gray-600 text-white font-pixel py-4 rounded border-b-4 border-gray-900 active:border-b-0 active:mt-1 flex items-center justify-center gap-2">
                 <Settings size={20}/> SETTINGS
              </button>
              <button onClick={() => { sfx.playClick(); onLeave(); }} className="bg-red-600 hover:bg-red-500 text-white font-pixel py-4 rounded border-b-4 border-red-800 active:border-b-0 active:mt-1 flex items-center justify-center gap-2">
                 <LogOut size={20}/> QUIT
              </button>
           </div>
        </div>
      )}

      {/* SETTINGS OVERLAY */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center pointer-events-auto cursor-auto">
           <div className="bg-gray-800 border-4 border-gray-600 rounded-lg p-8 w-96 relative">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                 <h2 className="font-pixel text-white text-lg flex items-center gap-2"><Settings/> SETTINGS</h2>
                 <button onClick={() => {sfx.playClick(); setShowSettings(false);}}><X className="text-gray-400 hover:text-white"/></button>
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
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-pixel text-gray-400">PARTICLES</label>
                    <button onClick={() => onUpdateSettings({...settings, particles: !settings.particles})} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.particles ? 'bg-green-600' : 'bg-gray-600'}`}>
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.particles ? 'translate-x-6' : ''}`} />
                    </button>
                 </div>
              </div>
              
              <div className="mt-8 text-center">
                  <button onClick={() => setShowSettings(false)} className="text-xs text-gray-500 hover:text-white font-pixel">CLOSE</button>
              </div>
           </div>
        </div>
      )}

      {/* VOTING OVERLAY */}
      {roundInfo.phase === RoundPhase.VOTING && (
         <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="font-pixel text-3xl text-yellow-400 mb-8 animate-pulse">VOTE NEXT MAP</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
               {availableMapsRef.current.slice(0, 4).map(mapId => (
                  <button key={mapId} onClick={() => { sfx.playClick(); if(hostConnectionRef.current) hostConnectionRef.current.send({type: PacketType.VOTE, mapId}); else if(isHostRef.current) votesRef.current.set(mapId, (votesRef.current.get(mapId)||0)+1); hasVotedRef.current = true; }} disabled={hasVotedRef.current} className={`p-6 border-4 rounded-lg flex flex-col items-center min-w-[150px] transition-all ${hasVotedRef.current ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${MAP_THEMES[mapId].background === '#3a5a40' ? 'border-green-600 bg-green-900' : 'border-blue-300 bg-blue-900'}`}>
                     <span className="font-pixel text-sm text-white">{MAP_THEMES[mapId].name}</span>
                     <span className="mt-2 text-2xl font-bold text-yellow-400">{roundInfo.votes[mapId] || 0}</span>
                  </button>
               ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-white font-pixel text-xs"><Clock size={16}/> {Math.ceil(roundInfo.time)}s</div>
         </div>
      )}

      {/* PRIVATE LOBBY OVERLAY */}
      {roundPhaseRef.current === RoundPhase.LOBBY_WAITING && (
         <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="font-pixel text-3xl text-purple-400 mb-2">PRIVATE PARTY</h2>
            <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 w-full max-w-lg mb-8">
               <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-4">
                   <span className="text-white font-pixel text-xs">ROOM CODE: <span className="text-yellow-400">{roomCodeDisplay}</span></span>
                   <span className="text-gray-400 text-xs">PLAYERS: {lobbyPlayers.length}/12</span>
               </div>
               <div className="space-y-2 h-64 overflow-y-auto">
                   {lobbyPlayers.map(p => (
                       <div key={p.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded border border-gray-700">
                           <div className="flex items-center gap-3">
                               {p.role === PlayerRole.LEADER && <Crown size={14} className="text-yellow-400" />}
                               <span className={p.id === 'local' ? 'text-white font-bold' : 'text-gray-300'}>{p.name}</span>
                           </div>
                           <span className="text-[10px] bg-blue-900 px-2 py-1 rounded text-blue-200">{p.role}</span>
                       </div>
                   ))}
               </div>
            </div>
            
            {isHostRef.current ? (
               <div className="flex flex-col items-center gap-2">
                   <button onClick={() => {
                        roundPhaseRef.current = RoundPhase.VOTING;
                        roundTimeRef.current = CONFIG.VOTE_DURATION;
                        const sync: RoundSyncPacket = { type: PacketType.ROUND_SYNC, phase: RoundPhase.VOTING, timeLeft: CONFIG.VOTE_DURATION };
                        connectionsRef.current.forEach(c => c.send(sync));
                   }} 
                   disabled={lobbyPlayers.length < 1}
                   className={`font-pixel py-4 px-12 rounded border-b-4 transition-all text-xl ${lobbyPlayers.length < 1 ? 'bg-gray-600 border-gray-800 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 border-green-800 text-white active:border-b-0 active:mt-1'}`}>
                       START MATCH
                   </button>
               </div>
            ) : (
               <div className="text-yellow-400 font-pixel animate-pulse">WAITING FOR HOST TO START...</div>
            )}
         </div>
      )}
    </>
  );
};

export default GameCanvas;
