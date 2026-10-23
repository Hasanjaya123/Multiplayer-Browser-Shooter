// Modular Weapon & Ground Resource Definitions shared between Server and Client
import { RESOURCE_IDS, BOMB_IDS } from './constants.js';

export const WEAPON_IDS = {
  M4: 1,
  MACHETE: 2,
  M249: 3,
  SNIPER: 4,
  SHOTGUN: 5,
  RPG: 6,
  FLAMETHROWER: 7
};

export const BOMB_META = {
  [BOMB_IDS.FRAG]: {
    id: BOMB_IDS.FRAG,
    name: 'Frag Grenade',
    shortName: 'FRAG',
    color: '#2ecc71'
  },
  [BOMB_IDS.GAS]: {
    id: BOMB_IDS.GAS,
    name: 'M7 Toxic Gas Bomb',
    shortName: 'M7 GAS',
    color: '#c4e538'
  },
  [BOMB_IDS.MINE]: {
    id: BOMB_IDS.MINE,
    name: 'Proxy Mine',
    shortName: 'PROXY MINE',
    color: '#00ff44'
  }
};

export const WEAPONS = {
  [WEAPON_IDS.M4]: {
    id: WEAPON_IDS.M4,
    key: 'm4',
    name: 'M4A1 Carbine',
    shortName: 'M4A1',
    automatic: true,
    isMelee: false,
    isExplosive: false,
    damage: 17,
    fireInterval: 0.105,     // ~570 RPM
    bulletSpeed: 1550,
    bulletLife: 0.95,
    spread: 0.038,
    pellets: 1,
    magSize: 30,
    reserveAmmo: 150,
    reloadTime: 1.75,
    recoilForce: 28,
    airRecoilMult: 1.35,
    speedMultiplier: 1.0,
    lookAhead: 0.78,         // Tighter look-ahead for reduced FOV
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 3.0,
    hasLaser: false,
    barrelLength: 34,
    color: '#95a5a6',
    tracerColor: '#ffeaa7',
    tracerWidth: 2.2
  },

  [WEAPON_IDS.MACHETE]: {
    id: WEAPON_IDS.MACHETE,
    key: 'machete',
    name: 'Combat Machete',
    shortName: 'MACHETE',
    automatic: false,
    isMelee: true,
    isExplosive: false,
    damage: 60,
    fireInterval: 0.36,
    meleeRange: 56,
    bulletSpeed: 0,
    bulletLife: 0,
    spread: 0,
    pellets: 0,
    magSize: 0,
    reserveAmmo: 0,
    reloadTime: 0,
    recoilForce: -65,
    airRecoilMult: 1.0,
    speedMultiplier: 1.08,
    lookAhead: 0.55,
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 4.5,
    hasLaser: false,
    barrelLength: 26,
    color: '#bdc3c7',
    tracerColor: '#ffffff',
    tracerWidth: 3.0
  },

  [WEAPON_IDS.M249]: {
    id: WEAPON_IDS.M249,
    key: 'm249',
    name: 'Heavy Machine Gun (M249 SAW)',
    shortName: 'M249 SAW',
    automatic: true,
    isMelee: false,
    isExplosive: false,
    damage: 15,
    fireInterval: 0.068,     // Blistering ~880 RPM suppressive fire
    bulletSpeed: 1620,
    bulletLife: 1.0,
    spread: 0.095,
    pellets: 1,
    magSize: 100,            // 100-round belt box magazine
    reserveAmmo: 200,
    reloadTime: 3.2,
    recoilForce: 82,         // Physical recoil pushback
    airRecoilMult: 1.85,
    speedMultiplier: 0.85,   // 15% movement & jetpack speed penalty
    lookAhead: 0.85,
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 6.2,
    hasLaser: false,
    barrelLength: 40,
    color: '#2ecc71',
    tracerColor: '#ffd32a',
    tracerWidth: 2.8
  },

  [WEAPON_IDS.SNIPER]: {
    id: WEAPON_IDS.SNIPER,
    key: 'sniper',
    name: 'AWP Sniper Rifle',
    shortName: 'SNIPER',
    automatic: false,
    isMelee: false,
    isExplosive: false,
    damage: 88,              // High single-shot damage
    fireInterval: 0.92,
    bulletSpeed: 2950,       // Ultra-fast velocity
    bulletLife: 1.25,
    spread: 0.002,
    pellets: 1,
    magSize: 5,
    reserveAmmo: 20,
    reloadTime: 2.3,
    recoilForce: 195,
    airRecoilMult: 1.5,
    speedMultiplier: 0.94,
    lookAhead: 1.65,         // Extended look-ahead + user-adjustable FOV
    cameraZoom: 1.0,
    allowCustomFov: true,    // ONLY Sniper Rifle allows adjustable Field of View!
    shakeAmount: 9.5,
    hasLaser: true,
    barrelLength: 48,
    color: '#e74c3c',
    tracerColor: '#ff7675',
    tracerWidth: 3.4
  },

  [WEAPON_IDS.SHOTGUN]: {
    id: WEAPON_IDS.SHOTGUN,
    key: 'shotgun',
    name: 'SPAS-12 Shotgun',
    shortName: 'SPAS-12',
    automatic: false,
    isMelee: false,
    isExplosive: false,
    damage: 14,              // 14 x 8 pellets = 112 max burst damage
    fireInterval: 0.62,
    bulletSpeed: 1320,
    bulletLife: 0.45,
    spread: 0.19,
    pellets: 8,
    magSize: 8,
    reserveAmmo: 32,
    reloadTime: 2.2,
    recoilForce: 210,
    airRecoilMult: 1.65,
    speedMultiplier: 0.97,
    lookAhead: 0.72,
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 8.5,
    hasLaser: false,
    barrelLength: 35,
    color: '#e67e22',
    tracerColor: '#fab1a0',
    tracerWidth: 2.0
  },

  [WEAPON_IDS.RPG]: {
    id: WEAPON_IDS.RPG,
    key: 'rpg',
    name: 'RPG-7 Rocket Launcher',
    shortName: 'RPG-7',
    automatic: false,
    isMelee: false,
    isExplosive: true,
    blastRadius: 165,
    damage: 118,
    fireInterval: 1.1,
    bulletSpeed: 760,
    bulletLife: 2.6,
    spread: 0.015,
    pellets: 1,
    magSize: 1,
    reserveAmmo: 5,
    reloadTime: 2.5,
    recoilForce: 260,
    airRecoilMult: 1.8,
    speedMultiplier: 0.88,
    lookAhead: 0.95,
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 11.0,
    hasLaser: false,
    barrelLength: 42,
    color: '#9b59b6',
    tracerColor: '#ff9f43',
    tracerWidth: 5.0
  },

  [WEAPON_IDS.FLAMETHROWER]: {
    id: WEAPON_IDS.FLAMETHROWER,
    key: 'flamethrower',
    name: 'M2-A1 Flamethrower (Rare)',
    shortName: 'FLAMER',
    automatic: true,
    isMelee: false,
    isExplosive: false,
    isFlame: true,
    isRare: true,
    damage: 7,               // Continuous high-rate stream + Burn DoT
    burnDps: 18,             // Burn damage per second after ignition
    burnDuration: 2.5,
    fireInterval: 0.048,     // ~21 flame puffs/sec
    bulletSpeed: 540,
    bulletLife: 0.46,
    spread: 0.16,
    pellets: 1,
    magSize: 100,
    reserveAmmo: 200,
    reloadTime: 2.8,
    recoilForce: 16,
    airRecoilMult: 1.2,
    speedMultiplier: 0.90,
    lookAhead: 0.75,
    cameraZoom: 1.0,
    allowCustomFov: false,
    shakeAmount: 2.2,
    hasLaser: false,
    barrelLength: 40,
    color: '#ff6b35',
    tracerColor: '#ff9f43',
    tracerWidth: 9.0
  }
};

export const RESOURCES = {
  [RESOURCE_IDS.GRENADE_CRATE]: {
    id: RESOURCE_IDS.GRENADE_CRATE,
    isResource: true,
    name: 'Frag Grenade Crate (+2 Frags)',
    shortName: 'FRAG CRATE'
  },
  [RESOURCE_IDS.AMMO_CRATE]: {
    id: RESOURCE_IDS.AMMO_CRATE,
    isResource: true,
    name: 'Ammunition Box (Full Ammo)',
    shortName: 'AMMO BOX'
  },
  [RESOURCE_IDS.MEDKIT_PACK]: {
    id: RESOURCE_IDS.MEDKIT_PACK,
    isResource: true,
    name: 'Field Medkit (+50 HP)',
    shortName: 'MEDKIT'
  },
  [RESOURCE_IDS.GAS_CRATE]: {
    id: RESOURCE_IDS.GAS_CRATE,
    isResource: true,
    name: 'M7 Toxic Gas Crate (+2 M7 Gas)',
    shortName: 'M7 GAS CRATE'
  },
  [RESOURCE_IDS.MINE_CRATE]: {
    id: RESOURCE_IDS.MINE_CRATE,
    isResource: true,
    name: 'Proxy Mine Crate (+2 Proxy Mines)',
    shortName: 'PROXY MINE CRATE'
  }
};

export function getWeapon(id) {
  return WEAPONS[id] || WEAPONS[WEAPON_IDS.M4];
}

export function getPickupInfo(id) {
  if (RESOURCES[id]) return RESOURCES[id];
  return WEAPONS[id] || WEAPONS[WEAPON_IDS.M4];
}

export function createWeaponSlot(weaponId) {
  const w = getWeapon(weaponId);
  return {
    id: w.id,
    mag: w.magSize,
    reserve: w.reserveAmmo
  };
}

