
export enum GameState {
  MENU,
  LOBBY,
  CONNECTING,
  PLAYING,
  GAME_OVER
}

export enum GameMode {
  GUN_GAME = 'Gun Game',
  TDM = 'Team Deathmatch',
  ONE_IN_CHAMBER = 'One in Chamber',
  ZOMBIES = 'Infection'
}

export enum WeaponType {
  KNIFE = 'Knife',
  SWORD = 'Sword',
  PISTOL = 'Pistol',
  REVOLVER = 'Revolver',
  SMG = 'SMG',
  SHOTGUN = 'Shotgun',
  ASSAULT_RIFLE = 'Assault Rifle',
  DMR = 'DMR',
  SNIPER = 'Sniper',
  MINIGUN = 'Minigun',
  LASER = 'Laser Cannon'
}

export enum GrenadeType {
  FRAG = 'Frag Grenade',
  SMOKE = 'Smoke Bomb',
  MOLOTOV = 'Molotov',
  STICKY = 'Sticky Bomb'
}

export enum AbilityType {
  DASH = 'Dash',
  SHIELD = 'Energy Shield',
  BERSERK = 'Berserk',
  HEAL = 'Medi-Kit',
  CLOAK = 'Cloak'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface SkinConfig {
  color: string;
  hat: string; 
  eyes: string; 
  clothes: string; 
}

export interface LoadoutConfig {
  primary: WeaponType;
  grenade: GrenadeType;
  ability: AbilityType;
}

export interface SettingsConfig {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  particles: boolean;
}

export enum PlayerRole {
  LEADER = 'Leader',
  GUEST = 'Guest',
  FRIEND = 'Friend'
}

export interface Player {
  id: string;
  name: string;
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  skin: SkinConfig;
  loadout: LoadoutConfig;
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  deaths: number;
  weaponIndex: number;
  level: number;
  xp: number;
  weapon: WeaponType;
  
  // Reloading & Ammo
  clipAmmo: number;
  isReloading: boolean;
  reloadEndTime: number;
  
  // Cooldowns & States
  lastFired: number;
  lastGrenade: number;
  lastAbility: number;
  activeAbility: AbilityType | null;
  abilityActiveUntil: number;
  
  angle: number;
  targetAngle?: number; // For AI smoothing
  isBot: boolean;
  botTargetId?: string | null; // For AI Logic
  animFrame: number; 
  role: PlayerRole;
  team?: 'RED' | 'BLUE' | 'SURVIVOR' | 'ZOMBIE';
  ammo?: number; // For One in Chamber total ammo
  isRemote?: boolean;
  ping?: number;
  isRemoteFiring?: boolean;
  speed?: number;
  dashCooldown: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  type: 'BULLET' | 'GRENADE';
  pos: Vector2;
  velocity: Vector2;
  damage: number;
  radius: number;
  color: string;
  life: number;
  maxLife?: number;
  grenadeType?: GrenadeType;
}

export interface Particle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  color: string;
  life: number;
  size: number;
}

export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
}

export interface Region {
  id: string;
  name: string;
  ping: number;
}

export interface Friend {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'in-game' | 'in-lobby';
  roomId?: string;
}

export enum ObstacleType {
  WALL,
  CRATE,
  TREE,
  CACTUS,
  STONE,
  BARREL,
  PILLAR,
  CRYSTAL,
  LAVA,
  ICE,
  FLOOR_DETAIL
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collidable: boolean;
}

export interface MapTheme {
  id: string;
  name: string;
  background: string;
  grid: string;
  obstacles: ObstacleType[];
  obstacleColor: string;
  detailColor: string;
}

// --- NETWORK TYPES ---

export enum PacketType {
  JOIN = 'JOIN',
  INPUT = 'INPUT',
  STATE_UPDATE = 'STATE_UPDATE',
  PING = 'PING',
  PONG = 'PONG',
  ROUND_SYNC = 'ROUND_SYNC',
  VOTE = 'VOTE',
  LOBBY_UPDATE = 'LOBBY_UPDATE',
  GAME_START = 'GAME_START',
  ACTION_USE = 'ACTION_USE',
  RELOAD = 'RELOAD'
}

export interface InputPacket {
  type: PacketType.INPUT;
  keys: string[];
  angle: number;
}

export interface StatePacket {
  type: PacketType.STATE_UPDATE;
  players: Player[];
  bullets: Bullet[];
  timestamp: number;
}

export interface JoinPacket {
  type: PacketType.JOIN;
  name: string;
  skin: SkinConfig;
  loadout: LoadoutConfig;
}

export interface LobbyUpdatePacket {
  type: PacketType.LOBBY_UPDATE;
  players: { id: string, name: string, role: PlayerRole }[];
  mode: GameMode;
  roomId?: string;
}

export interface GameStartPacket {
  type: PacketType.GAME_START;
  mode: GameMode;
}

export interface ActionPacket {
  type: PacketType.ACTION_USE;
  action: 'GRENADE' | 'ABILITY';
}

export interface PingPacket {
  type: PacketType.PING;
  timestamp: number;
}

export interface PongPacket {
  type: PacketType.PONG;
  timestamp: number;
}

export enum RoundPhase {
  LOBBY_WAITING,
  VOTING,
  FIGHTING,
  GAME_OVER
}

export interface RoundSyncPacket {
  type: PacketType.ROUND_SYNC;
  phase: RoundPhase;
  timeLeft: number;
  votes?: Record<string, number>;
}

export interface VotePacket {
  type: PacketType.VOTE;
  mapId: string;
}
