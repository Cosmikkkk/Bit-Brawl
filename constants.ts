
import { WeaponType, MapTheme, ObstacleType, AbilityType, GrenadeType } from "./types";

export const CONFIG = {
  MAP_WIDTH: 2000,
  MAP_HEIGHT: 2000,
  PLAYER_SPEED: 5.5,
  PLAYER_RADIUS: 24,
  FRICTION: 0.82,
  FPS: 60,
  MAX_PARTICLES: 80,
  ROUND_DURATION: 300,
  VOTE_DURATION: 10,
};

export const WEAPON_PROGRESSION = [
  WeaponType.PISTOL,
  WeaponType.REVOLVER,
  WeaponType.SMG,
  WeaponType.SHOTGUN,
  WeaponType.ASSAULT_RIFLE,
  WeaponType.DMR,
  WeaponType.SNIPER,
  WeaponType.MINIGUN,
  WeaponType.LASER,
  WeaponType.SWORD,
  WeaponType.KNIFE
];

export const GRENADE_STATS: Record<GrenadeType, { cooldown: number; color: string; radius: number; damage: number; fuse: number }> = {
  [GrenadeType.FRAG]: { cooldown: 8000, color: '#4b5563', radius: 180, damage: 90, fuse: 60 },
  [GrenadeType.SMOKE]: { cooldown: 12000, color: '#e5e7eb', radius: 300, damage: 0, fuse: 60 },
  [GrenadeType.MOLOTOV]: { cooldown: 15000, color: '#ef4444', radius: 140, damage: 25, fuse: 20 },
  [GrenadeType.STICKY]: { cooldown: 10000, color: '#10b981', radius: 120, damage: 110, fuse: 120 }
};

export const ABILITY_STATS: Record<AbilityType, { cooldown: number; duration: number; color: string; desc: string }> = {
  [AbilityType.DASH]: { cooldown: 4000, duration: 10, color: '#ffffff', desc: 'High Velocity Dash' },
  [AbilityType.SHIELD]: { cooldown: 20000, duration: 3000, color: '#3b82f6', desc: 'Invulnerability Shield' },
  [AbilityType.BERSERK]: { cooldown: 30000, duration: 5000, color: '#ef4444', desc: '+50% Dmg & Speed' },
  [AbilityType.HEAL]: { cooldown: 45000, duration: 1000, color: '#10b981', desc: 'Restore 50 HP' },
  [AbilityType.CLOAK]: { cooldown: 25000, duration: 4000, color: '#6b7280', desc: 'Invisibility' }
};

export const BOT_NAMES = [
  "PixelSlayer", "BitWarrior", "GlitchKing", "NoobMaster", "LagSwitch",
  "FrameDrop", "RetroHero", "CyberPunk", "VoxelViper", "RenderRogue",
  "ByteBasher", "CtrlAltDefeat", "404NotFound", "PingPong", "Zoomer",
  "BoomerBot", "SweatyGamer", "TryHard", "GGEZ", "NullPointer",
  "ScreenTear", "PolygonPal", "ShaderBoy", "TextureMissing", "DevTool"
];

export const COSMETICS = {
  colors: [
    { id: '#3b82f6', name: 'Blue' },
    { id: '#ef4444', name: 'Red' },
    { id: '#10b981', name: 'Green' },
    { id: '#f59e0b', name: 'Yellow' },
    { id: '#8b5cf6', name: 'Purple' },
    { id: '#111827', name: 'Black' },
    { id: '#ffffff', name: 'White' },
    { id: '#ec4899', name: 'Pink' },
    { id: '#06b6d4', name: 'Cyan' },
    { id: '#f97316', name: 'Orange' },
    { id: '#78350f', name: 'Brown' },
    { id: '#a3e635', name: 'Lime' },
    { id: '#6366f1', name: 'Indigo' },
    { id: '#14b8a6', name: 'Teal' },
  ],
  hats: [
    { id: 'none', name: 'None' },
    { id: 'crown', name: 'Crown' },
    { id: 'viking', name: 'Viking' },
    { id: 'headphones', name: 'Gamer' },
    { id: 'halo', name: 'Halo' },
    { id: 'mohawk', name: 'Mohawk' },
    { id: 'wizard', name: 'Wizard' },
    { id: 'fedora', name: 'Fedora' },
    { id: 'astronaut', name: 'Astro' },
    { id: 'pirate', name: 'Pirate' },
    { id: 'flower', name: 'Flower' },
    { id: 'beanie', name: 'Beanie' },
    { id: 'tophat', name: 'Top Hat' },
    { id: 'helmet', name: 'Helmet' },
    { id: 'bandana', name: 'Bandana' },
  ],
  eyes: [
    { id: 'normal', name: 'Normal' },
    { id: 'angry', name: 'Angry' },
    { id: 'cyclops', name: 'Cyclops' },
    { id: 'shades', name: 'Shades' },
    { id: 'blindfold', name: 'Blindfold' },
    { id: 'robot', name: 'Robot' },
    { id: 'tired', name: 'Tired' },
    { id: 'kawaii', name: 'Kawaii' },
    { id: 'laser', name: 'Laser' },
    { id: 'patch', name: 'Eye Patch' },
  ],
  clothes: [
    { id: 'none', name: 'None' },
    { id: 'suit', name: 'Suit' },
    { id: 'overalls', name: 'Overalls' },
    { id: 'military', name: 'Tactical' },
    { id: 'robe', name: 'Robe' },
    { id: 'tanktop', name: 'Tank Top' },
    { id: 'tux', name: 'Tuxedo' },
    { id: 'armor', name: 'Armor' },
    { id: 'hoodie', name: 'Hoodie' },
    { id: 'ninja', name: 'Ninja' },
  ]
};

export const MAP_THEMES: Record<string, MapTheme> = {
  GRASSLAND: {
    id: 'GRASSLAND',
    name: 'Ancient Ruins',
    background: '#3a5a40',
    grid: '#344e41',
    obstacles: [ObstacleType.WALL, ObstacleType.TREE, ObstacleType.STONE],
    obstacleColor: '#7f7f7f',
    detailColor: '#588157'
  },
  DESERT: {
    id: 'DESERT',
    name: 'Dusty Outpost',
    background: '#d4a373',
    grid: '#bc8a5f',
    obstacles: [ObstacleType.WALL, ObstacleType.CACTUS, ObstacleType.CRATE],
    obstacleColor: '#a67c52',
    detailColor: '#e6ccb2'
  },
  CYBER: {
    id: 'CYBER',
    name: 'Neon City',
    background: '#0f172a',
    grid: '#1e293b',
    obstacles: [ObstacleType.WALL, ObstacleType.BARREL, ObstacleType.PILLAR],
    obstacleColor: '#334155',
    detailColor: '#1e293b'
  },
  SNOW: {
    id: 'SNOW',
    name: 'Arctic Base',
    background: '#e0f2fe',
    grid: '#bae6fd',
    obstacles: [ObstacleType.WALL, ObstacleType.ICE, ObstacleType.STONE],
    obstacleColor: '#94a3b8',
    detailColor: '#f0f9ff'
  },
  LAVA: {
    id: 'LAVA',
    name: 'Magma Core',
    background: '#450a0a',
    grid: '#7f1d1d',
    obstacles: [ObstacleType.WALL, ObstacleType.LAVA, ObstacleType.STONE],
    obstacleColor: '#78350f',
    detailColor: '#b91c1c'
  },
  SPACE: {
    id: 'SPACE',
    name: 'Lunar Station',
    background: '#000000',
    grid: '#333333',
    obstacles: [ObstacleType.WALL, ObstacleType.BARREL, ObstacleType.CRYSTAL],
    obstacleColor: '#555',
    detailColor: '#111'
  },
  FOREST: {
    id: 'FOREST',
    name: 'Deep Woods',
    background: '#14532d',
    grid: '#166534',
    obstacles: [ObstacleType.TREE, ObstacleType.TREE, ObstacleType.STONE],
    obstacleColor: '#3f2c22',
    detailColor: '#15803d'
  },
  CANDY: {
    id: 'CANDY',
    name: 'Sugar Rush',
    background: '#fce7f3',
    grid: '#fbcfe8',
    obstacles: [ObstacleType.WALL, ObstacleType.PILLAR, ObstacleType.CRATE],
    obstacleColor: '#ec4899',
    detailColor: '#fdf2f8'
  },
  DUNGEON: {
    id: 'DUNGEON',
    name: 'Dark Dungeon',
    background: '#262626',
    grid: '#404040',
    obstacles: [ObstacleType.WALL, ObstacleType.BARREL, ObstacleType.STONE],
    obstacleColor: '#525252',
    detailColor: '#171717'
  },
  AQUATIC: {
    id: 'AQUATIC',
    name: 'Ocean Floor',
    background: '#083344',
    grid: '#155e75',
    obstacles: [ObstacleType.WALL, ObstacleType.CRYSTAL, ObstacleType.STONE],
    obstacleColor: '#164e63',
    detailColor: '#0e7490'
  }
};

export const WEAPON_STATS: Record<WeaponType, { damage: number; cooldown: number; speed: number; spread: number; range: number; count: number; color: string; isMelee?: boolean; clipSize: number; reloadTime: number }> = {
  [WeaponType.KNIFE]: { damage: 34, cooldown: 25, speed: 0, spread: 0.5, range: 45, count: 1, color: '#e5e7eb', isMelee: true, clipSize: 999, reloadTime: 0 },
  [WeaponType.SWORD]: { damage: 60, cooldown: 40, speed: 0, spread: 1.0, range: 70, count: 1, color: '#3b82f6', isMelee: true, clipSize: 999, reloadTime: 0 },
  [WeaponType.PISTOL]: { damage: 18, cooldown: 20, speed: 16, spread: 0.05, range: 60, count: 1, color: '#9ca3af', clipSize: 12, reloadTime: 1200 },
  [WeaponType.REVOLVER]: { damage: 35, cooldown: 45, speed: 18, spread: 0.02, range: 70, count: 1, color: '#d1d5db', clipSize: 6, reloadTime: 2000 },
  [WeaponType.SMG]: { damage: 12, cooldown: 5, speed: 17, spread: 0.15, range: 45, count: 1, color: '#4b5563', clipSize: 30, reloadTime: 1500 },
  [WeaponType.SHOTGUN]: { damage: 9, cooldown: 55, speed: 14, spread: 0.35, range: 35, count: 6, color: '#78350f', clipSize: 8, reloadTime: 3000 },
  [WeaponType.ASSAULT_RIFLE]: { damage: 22, cooldown: 9, speed: 19, spread: 0.08, range: 65, count: 1, color: '#1f2937', clipSize: 30, reloadTime: 2200 },
  [WeaponType.DMR]: { damage: 45, cooldown: 25, speed: 22, spread: 0.01, range: 90, count: 1, color: '#374151', clipSize: 15, reloadTime: 2500 },
  [WeaponType.SNIPER]: { damage: 95, cooldown: 80, speed: 32, spread: 0.0, range: 120, count: 1, color: '#1e3a8a', clipSize: 5, reloadTime: 3500 },
  [WeaponType.MINIGUN]: { damage: 8, cooldown: 3, speed: 18, spread: 0.25, range: 55, count: 1, color: '#b91c1c', clipSize: 100, reloadTime: 5000 },
  [WeaponType.LASER]: { damage: 25, cooldown: 12, speed: 25, spread: 0, range: 100, count: 1, color: '#ef4444', clipSize: 20, reloadTime: 4000 },
};

export const REGIONS = [
  { id: 'us-east', name: 'NA East', ping: 35 },
  { id: 'us-west', name: 'NA West', ping: 78 },
  { id: 'eu-central', name: 'Europe', ping: 110 },
  { id: 'asia-east', name: 'Asia', ping: 205 },
];
