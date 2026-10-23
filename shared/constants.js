// Shared constants between Authoritative Server and Client Prediction Engine

export const WORLD_WIDTH = 4400;
export const WORLD_HEIGHT = 1650;
export const ABYSS_DEATH_Y = 1595; // Falling below this Y coordinate kills the player automatically by falling into the abyss

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE; // 16.6667ms
export const SNAPSHOT_DIVISOR = 2;    // 30 Hz compact delta/tuple broadcast

// Camera & Field of View (FOV) Settings
// Higher zoom value = Reduced/Tighter Field of View (closer to soldier)
export const BASE_CAMERA_ZOOM = 1.38;      // Reduced standard FOV for all non-sniper weapons
export const SNIPER_FOV_MIN_MULT = 1.0;    // 1.0x = Normal tight FOV (zoom 1.38)
export const SNIPER_FOV_MAX_MULT = 2.05;   // 2.05x = Wide Sniper FOV (zoom ~0.67)
export const SNIPER_FOV_DEFAULT_MULT = 1.5; // Default Sniper FOV multiplier when equipping Sniper

// Player physics constants (tuned for classic Mini Militia feel on PC)
export const PLAYER_RADIUS = 17;
export const PLAYER_HIT_RADIUS = 19;
export const GRAVITY = 920;
export const MOVE_ACCEL_GROUND = 2800;
export const MOVE_ACCEL_AIR = 1550;
export const MAX_WALK_SPEED = 255;
export const MAX_AIR_SPEED_X = 280;
export const GROUND_FRICTION = 13.5;
export const AIR_DRAG_X = 2.0;
export const AIR_DRAG_Y = 0.5;

// Jetpack constants
export const JETPACK_ACCEL = 1520;
export const JETPACK_COUNTER_FALL_BONUS = 580; // Extra responsiveness when arresting downward velocity
export const MAX_JETPACK_UP_SPEED = -380;
export const MAX_FALL_SPEED = 620;
export const JETPACK_FUEL_MAX = 100;
export const JETPACK_BURN_RATE = 23;       // ~4.3s continuous flight
export const JETPACK_REGEN_GROUND = 38;    // Fast recharge when grounded
export const JETPACK_REGEN_AIR = 13;       // Slow recharge when coasting in air
export const JETPACK_COOLDOWN_DELAY = 0.4; // Delay after thrust stops before mid-air regen

// Health, Respawn, and Combat
export const MAX_HEALTH = 100;
export const HEALTH_REGEN_DELAY = 7.0;     // 7 seconds out of combat
export const HEALTH_REGEN_RATE = 16.0;     // HP per second
export const RESPAWN_TIME = 5.0;           // 5 seconds respawn timer after each death
export const SPAWN_SHIELD_TIME = 1.5;      // Brief spawn invulnerability

// Match Timer Defaults
export const DEFAULT_MATCH_DURATION = 300; // Default 5 minutes (300s), configurable by Admin

// Frag Grenades, M7 Toxic Gas Grenades & Proxy Mines
export const BOMB_IDS = {
  FRAG: 1,
  GAS: 2,
  MINE: 3
};

export const GRENADE_FUSE = 3.0;           // 3-second fuse for Frag
export const GAS_GRENADE_FUSE = 2.0;       // 2-second fuse for M7 Gas Grenade
export const GRENADE_THROW_SPEED = 700;
export const GRENADE_RADIUS = 6;
export const GRENADE_BLAST_RADIUS = 170;
export const GRENADE_MAX_DAMAGE = 128;
export const GRENADE_KNOCKBACK = 560;
export const GRENADE_RESTITUTION = 0.56;
export const GRENADE_FRICTION = 0.88;
export const DEFAULT_GRENADES = 2;
export const MAX_GRENADES = 4;

// M7 Toxic Gas Cloud Constants
export const GAS_CLOUD_RADIUS = 145;
export const GAS_CLOUD_DURATION = 8.5;     // Seconds cloud lingers
export const GAS_CLOUD_DPS = 24;           // Health drained per second inside toxic gas

// Proxy Mine (Proximity Mine) Constants
export const PROXY_MINE_ARM_TIME = 0.75;   // Seconds after sticking to wall/floor/ceiling before active
export const PROXY_MINE_TRIGGER_RADIUS = 68; // Detonates automatically when enemy walks near it
export const PROXY_MINE_BLAST_RADIUS = 165;
export const PROXY_MINE_MAX_DAMAGE = 126;
export const PROXY_MINE_LIFETIME = 75.0;   // Max deployed lifetime

// Pickups
export const PICKUP_INTERACT_RADIUS = 52;
export const PICKUP_RESPAWN_TIME = 15.0;   // Seconds before ground weapon/resource respawns
export const RARE_WEAPON_RESPAWN_TIME = 40.0; // Rare Flamethrower respawn time
export const DROPPED_WEAPON_LIFETIME = 25.0;

// Ground Resource Types (beyond weapons)
export const RESOURCE_IDS = {
  GRENADE_CRATE: 101,
  AMMO_CRATE: 102,
  MEDKIT_PACK: 103,
  GAS_CRATE: 104,
  MINE_CRATE: 105
};

// Soldier color palette
export const SOLDIER_COLORS = [
  { id: 0, name: 'Olive Commando', body: '#4b6b3b', vest: '#2d4222', helmet: '#39542c', accent: '#7ab35c' },
  { id: 1, name: 'Crimson Viper', body: '#b33939', vest: '#6e1e1e', helmet: '#8f2929', accent: '#ff5252' },
  { id: 2, name: 'Cobalt Striker', body: '#2980b9', vest: '#1b4f72', helmet: '#2471a3', accent: '#54a0ff' },
  { id: 3, name: 'Amber Recon', body: '#d68910', vest: '#7e5109', helmet: '#b9770e', accent: '#f8c291' },
  { id: 4, name: 'Phantom Purple', body: '#8854d0', vest: '#4b2c75', helmet: '#6c3fb0', accent: '#a55eea' },
  { id: 5, name: 'Cyber Teal', body: '#0fb9b1', vest: '#076b66', helmet: '#0a8f89', accent: '#2bcbba' },
  { id: 6, name: 'Desert Sand', body: '#c2a675', vest: '#735f3d', helmet: '#9e8356', accent: '#e6ce9e' },
  { id: 7, name: 'SpecOps Shadow', body: '#485460', vest: '#1e272e', helmet: '#2f3640', accent: '#808e9b' }
];

// Event Type IDs for compact network event tuples
export const EVT_FIRE = 1;
export const EVT_EXPLOSION = 2;
export const EVT_HIT = 3;
export const EVT_KILL = 4;
export const EVT_MELEE = 5;
export const EVT_PICKUP = 6;
export const EVT_GRENADE_THROW = 7;
export const EVT_RELOAD = 8;
export const EVT_GAS_CLOUD = 9;
export const EVT_MINE_TRIGGER = 10;
