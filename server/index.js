// High-Performance 60Hz Authoritative Multiplayer Server for Mini Militia PC & Mobile (Outpost)
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ABYSS_DEATH_Y,
  TICK_RATE,
  TICK_DT,
  SNAPSHOT_DIVISOR,
  PLAYER_RADIUS,
  MAX_HEALTH,
  HEALTH_REGEN_DELAY,
  HEALTH_REGEN_RATE,
  RESPAWN_TIME,
  SPAWN_SHIELD_TIME,
  DEFAULT_MATCH_DURATION,
  JETPACK_FUEL_MAX,
  BOMB_IDS,
  GRENADE_FUSE,
  GAS_GRENADE_FUSE,
  GRENADE_THROW_SPEED,
  GRENADE_BLAST_RADIUS,
  GRENADE_MAX_DAMAGE,
  GRENADE_KNOCKBACK,
  DEFAULT_GRENADES,
  MAX_GRENADES,
  GAS_CLOUD_RADIUS,
  GAS_CLOUD_DURATION,
  GAS_CLOUD_DPS,
  PROXY_MINE_ARM_TIME,
  PROXY_MINE_TRIGGER_RADIUS,
  PROXY_MINE_BLAST_RADIUS,
  PROXY_MINE_MAX_DAMAGE,
  PROXY_MINE_LIFETIME,
  PICKUP_INTERACT_RADIUS,
  PICKUP_RESPAWN_TIME,
  RARE_WEAPON_RESPAWN_TIME,
  DROPPED_WEAPON_LIFETIME,
  EVT_FIRE,
  EVT_EXPLOSION,
  EVT_HIT,
  EVT_KILL,
  EVT_MELEE,
  EVT_PICKUP,
  EVT_GRENADE_THROW,
  EVT_RELOAD,
  EVT_GAS_CLOUD,
  EVT_MINE_TRIGGER,
  RESOURCE_IDS
} from '../shared/constants.js';
import { WEAPON_IDS, RESOURCES, getWeapon, createWeaponSlot } from '../shared/weapons.js';
import { COMPILED_MAP, SPAWN_POINTS, MAP_WEAPON_PADS } from '../shared/map.js';
import {
  stepPlayerPhysics,
  stepGrenadePhysics,
  raycastMap,
  raycastPlayers,
  closestPointOnSegment
} from '../shared/physics.js';
import { ObjectPool } from '../shared/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with native ws WebSocketServer engine and perMessageDeflate: false for minimal latency
const io = new SocketIOServer(server, {
  wsEngine: WebSocketServer,
  perMessageDeflate: false,
  httpCompression: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 5000,
  pingTimeout: 10000
});

// Serve static frontend and shared deterministic physics modules
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/shared', express.static(path.join(ROOT_DIR, 'shared')));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    tickRate: TICK_RATE,
    players: players.size,
    matchRemainingSec: Math.ceil(matchRemainingSec),
    matchEnded
  });
});

// ==================== AUTHORITATIVE GAME & MATCH STATE ====================
const players = new Map(); // numericId -> player object
const socketToPlayerId = new Map();
const savedSessions = new Map(); // sessionId -> { kills, deaths, streak, bestStreak, name, colorId }

let nextPlayerNumericId = 1;
let nextEntityId = 1;
let serverTick = 0;

// Admin & Match Timer State
let adminPlayerId = null;
let adminSessionId = null;
let matchDurationSec = DEFAULT_MATCH_DURATION; // Default 300s (5 mins), determined by Admin
let matchRemainingSec = DEFAULT_MATCH_DURATION;
let matchEnded = false;

// Pre-allocated Object Pool for Projectiles (Bullets, Rockets & Flame Streams)
const projectilePool = new ObjectPool(
  () => ({
    id: 0,
    ownerId: 0,
    weaponId: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    damage: 10,
    life: 1.0,
    isExplosive: false,
    isFlame: false,
    blastRadius: 0
  }),
  (proj, id, ownerId, weaponId, x, y, vx, vy, damage, life, isExplosive, blastRadius, isFlame = false) => {
    proj.id = id;
    proj.ownerId = ownerId;
    proj.weaponId = weaponId;
    proj.x = x;
    proj.y = y;
    proj.vx = vx;
    proj.vy = vy;
    proj.damage = damage;
    proj.life = life;
    proj.isExplosive = isExplosive;
    proj.isFlame = isFlame;
    proj.blastRadius = blastRadius;
  },
  256
);

const activeGrenades = [];
const activeGasClouds = [];
const droppedWeapons = [];
const pendingEvents = [];

// Initialize Map Weapon Spawn Pads
const mapPadsState = MAP_WEAPON_PADS.map(pad => ({
  id: pad.id,
  x: pad.x,
  y: pad.y,
  weaponId: pad.weaponId,
  respawnTime: pad.respawnTime || PICKUP_RESPAWN_TIME,
  active: true,
  respawnTimer: 0
}));

// Bot management
let autoBotEnabled = true;
let manualBotCount = 0;

function round1(v) {
  return Math.round(v * 10) / 10;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function syncPlayerGrenadesCount(player) {
  if (!player.bombs) {
    player.bombs = {
      [BOMB_IDS.FRAG]: DEFAULT_GRENADES,
      [BOMB_IDS.GAS]: 1,
      [BOMB_IDS.MINE]: 1
    };
  }
  if (!player.activeBombType) {
    player.activeBombType = BOMB_IDS.FRAG;
  }
  if ((player.bombs[player.activeBombType] || 0) <= 0) {
    for (const bId of [BOMB_IDS.FRAG, BOMB_IDS.GAS, BOMB_IDS.MINE]) {
      if ((player.bombs[bId] || 0) > 0) {
        player.activeBombType = bId;
        break;
      }
    }
  }
  player.grenades = player.bombs[player.activeBombType] || 0;
}

function packBombCode(player) {
  syncPlayerGrenadesCount(player);
  const f = Math.min(15, Math.max(0, player.bombs[BOMB_IDS.FRAG] || 0));
  const g = Math.min(15, Math.max(0, player.bombs[BOMB_IDS.GAS] || 0));
  const m = Math.min(15, Math.max(0, player.bombs[BOMB_IDS.MINE] || 0));
  const t = Math.min(3, Math.max(1, player.activeBombType || BOMB_IDS.FRAG));
  return f | (g << 4) | (m << 8) | (t << 12);
}

function pickSafeSpawnPoint(excludeId) {
  let bestSpawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  let bestMinDist = -1;

  for (let i = 0; i < SPAWN_POINTS.length; i++) {
    const sp = SPAWN_POINTS[i];
    let minEnemyDist = Infinity;
    for (const p of players.values()) {
      if (p.id === excludeId || p.dead) continue;
      const d = Math.hypot(p.x - sp.x, p.y - sp.y);
      if (d < minEnemyDist) minEnemyDist = d;
    }
    const score = (minEnemyDist === Infinity ? 1000 : minEnemyDist) + Math.random() * 140;
    if (score > bestMinDist) {
      bestMinDist = score;
      bestSpawn = sp;
    }
  }
  return bestSpawn;
}

function createPlayerState(id, socketId, name, colorId, isBot = false, sessionId = null) {
  const spawn = pickSafeSpawnPoint(id);
  const slot0 = createWeaponSlot(WEAPON_IDS.M4);
  const slot1 = createWeaponSlot(WEAPON_IDS.MACHETE);

  return {
    id,
    socketId,
    sessionId,
    name: (name || `Soldier_${id}`).slice(0, 16),
    colorId: Number.isInteger(colorId) ? Math.max(0, Math.min(7, colorId)) : (id % 8),
    isBot,

    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    aimAngle: 0,
    grounded: false,
    jetpackActive: false,
    crouched: false,
    jetpackCooldown: 0,
    fuel: JETPACK_FUEL_MAX,
    lastFireTime: 0,

    health: MAX_HEALTH,
    dead: false,
    respawnTimer: 0,
    spawnShield: SPAWN_SHIELD_TIME,
    lastDamageTime: 0,
    lastKilledByName: '',
    burnTimer: 0,
    burnAttackerId: 0,
    burnTickAccum: 0,

    slots: [slot0, slot1],
    activeSlot: 0,
    activeWeaponId: slot0.id,
    bombs: {
      [BOMB_IDS.FRAG]: DEFAULT_GRENADES,
      [BOMB_IDS.GAS]: 1,
      [BOMB_IDS.MINE]: 1
    },
    activeBombType: BOMB_IDS.FRAG,
    grenades: DEFAULT_GRENADES,

    fireCooldown: 0,
    grenadeCooldown: 0,
    meleeCooldown: 0,
    reloading: false,
    reloadTimer: 0,
    reloadDuration: 0,

    kills: 0,
    deaths: 0,
    streak: 0,
    bestStreak: 0,
    ping: isBot ? 0 : 1,

    lastSeq: 0,
    inputQueue: [],
    latestInput: {
      left: false,
      right: false,
      jetpack: false,
      down: false,
      crouch: false,
      aimAngle: 0,
      shoot: false,
      shootPressed: false,
      grenadePressed: false,
      meleePressed: false,
      interactPressed: false,
      reloadPressed: false,
      switchSlot: -1
    },
    prevShoot: false,

    botTargetId: null,
    botPatrolDir: Math.random() < 0.5 ? -1 : 1,
    botThinkTimer: 0
  };
}

function resetPlayerForRespawn(player) {
  const spawn = pickSafeSpawnPoint(player.id);
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.jetpackActive = false;
  player.crouched = false;
  player.fuel = JETPACK_FUEL_MAX;
  player.health = MAX_HEALTH;
  player.dead = false;
  player.respawnTimer = 0;
  player.spawnShield = SPAWN_SHIELD_TIME;
  player.burnTimer = 0;
  player.burnAttackerId = 0;
  player.burnTickAccum = 0;
  player.slots = [
    createWeaponSlot(WEAPON_IDS.M4),
    createWeaponSlot(WEAPON_IDS.MACHETE)
  ];
  player.activeSlot = 0;
  player.activeWeaponId = player.slots[0].id;
  player.bombs = {
    [BOMB_IDS.FRAG]: DEFAULT_GRENADES,
    [BOMB_IDS.GAS]: 1,
    [BOMB_IDS.MINE]: 1
  };
  player.activeBombType = BOMB_IDS.FRAG;
  player.grenades = DEFAULT_GRENADES;
  player.reloading = false;
  player.reloadTimer = 0;
  player.fireCooldown = 0;
}

function ensureAdminAssigned() {
  if (adminPlayerId && players.has(adminPlayerId)) {
    const p = players.get(adminPlayerId);
    if (!p.isBot) return;
  }
  adminPlayerId = null;
  for (const p of players.values()) {
    if (!p.isBot) {
      adminPlayerId = p.id;
      adminSessionId = p.sessionId || null;
      break;
    }
  }
}

function broadcastRoster() {
  ensureAdminAssigned();
  const roster = [];
  for (const p of players.values()) {
    roster.push([
      p.id,
      p.name,
      p.colorId,
      p.isBot ? 1 : 0,
      p.id === adminPlayerId ? 1 : 0
    ]);
  }
  io.emit('roster', roster);
  io.emit('matchMeta', {
    adminId: adminPlayerId,
    matchDurationSec,
    matchRemainingSec: Math.ceil(matchRemainingSec),
    matchEnded
  });
}

function buildFinalRankings() {
  const list = [];
  for (const p of players.values()) {
    list.push({
      id: p.id,
      name: p.name,
      colorId: p.colorId,
      isBot: !!p.isBot,
      kills: p.kills,
      deaths: p.deaths,
      bestStreak: p.bestStreak || 0,
      kd: p.deaths > 0 ? Number((p.kills / p.deaths).toFixed(2)) : p.kills
    });
  }
  // Highest kill count is the winner; tie-breaker: fewer deaths, then best streak
  list.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (a.deaths !== a.deaths) return a.deaths - b.deaths;
    return b.bestStreak - a.bestStreak;
  });

  return list.map((item, idx) => ({
    rank: idx + 1,
    ...item
  }));
}

function restartMatchWithDuration(newDurationSec) {
  if (typeof newDurationSec === 'number' && !Number.isNaN(newDurationSec)) {
    matchDurationSec = Math.max(30, Math.min(3600, Math.round(newDurationSec)));
  }
  matchRemainingSec = matchDurationSec;
  matchEnded = false;

  // Clear saved disconnected session scores for the new match
  savedSessions.clear();

  // Clear all active projectiles, grenades, gas clouds, and dropped weapons
  projectilePool.clear();
  activeGrenades.length = 0;
  activeGasClouds.length = 0;
  droppedWeapons.length = 0;
  pendingEvents.length = 0;

  // Reset all map weapon & supply pads
  for (let i = 0; i < mapPadsState.length; i++) {
    mapPadsState[i].active = true;
    mapPadsState[i].respawnTimer = 0;
  }

  // Reset all connected players & bots
  for (const p of players.values()) {
    p.kills = 0;
    p.deaths = 0;
    p.streak = 0;
    p.bestStreak = 0;
    p.lastKilledByName = '';
    resetPlayerForRespawn(p);
  }

  broadcastRoster();
  io.emit('matchRestart', {
    matchDurationSec,
    matchRemainingSec: matchDurationSec,
    adminId: adminPlayerId
  });
}

function syncBotsWithHumanCount() {
  let humanCount = 0;
  const botIds = [];
  for (const p of players.values()) {
    if (p.isBot) botIds.push(p.id);
    else humanCount++;
  }

  const desiredBots = humanCount === 0
    ? 0
    : (humanCount === 1 && autoBotEnabled ? Math.max(1, manualBotCount) : manualBotCount);

  let changed = false;
  while (botIds.length < desiredBots) {
    const botId = nextPlayerNumericId++;
    const botNames = ['Sarge [BOT]', 'Viper [BOT]', 'Ghost [BOT]', 'Tank [BOT]'];
    const botName = botNames[(botId - 1) % botNames.length];
    const bot = createPlayerState(botId, null, botName, (botId + 1) % 8, true, null);
    players.set(botId, bot);
    botIds.push(botId);
    changed = true;
  }

  while (botIds.length > desiredBots) {
    const removeId = botIds.pop();
    players.delete(removeId);
    changed = true;
  }

  if (changed) {
    broadcastRoster();
  }
}

// ==================== COMBAT & WEAPON ACTIONS ====================

function startReload(player) {
  if (player.dead || player.reloading || matchEnded) return;
  const slot = player.slots[player.activeSlot];
  const weapon = getWeapon(slot.id);
  if (weapon.isMelee) return;
  if (slot.mag >= weapon.magSize || slot.reserve <= 0) return;

  player.reloading = true;
  player.reloadDuration = weapon.reloadTime;
  player.reloadTimer = weapon.reloadTime;
  pendingEvents.push([EVT_RELOAD, player.id, weapon.id]);
}

function switchWeaponSlot(player, targetSlot) {
  if (player.dead || matchEnded) return;
  const nextSlot = (targetSlot === 0 || targetSlot === 1) ? targetSlot : (1 - player.activeSlot);
  if (nextSlot === player.activeSlot) return;

  player.activeSlot = nextSlot;
  player.activeWeaponId = player.slots[nextSlot].id;
  player.reloading = false;
  player.reloadTimer = 0;
  player.fireCooldown = Math.max(player.fireCooldown, 0.14);
}

function switchBombType(player, requestedType = -1) {
  if (player.dead || matchEnded) return;
  const order = [BOMB_IDS.FRAG, BOMB_IDS.GAS, BOMB_IDS.MINE];
  if (requestedType >= 1 && requestedType <= 3) {
    player.activeBombType = requestedType;
    syncPlayerGrenadesCount(player);
    return;
  }
  const curIdx = Math.max(0, order.indexOf(player.activeBombType || BOMB_IDS.FRAG));
  // Prefer next bomb type that has > 0 count
  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(curIdx + step) % order.length];
    if ((player.bombs[candidate] || 0) > 0) {
      player.activeBombType = candidate;
      player.grenades = player.bombs[candidate];
      return;
    }
  }
  // Otherwise cycle anyway
  const nextType = order[(curIdx + 1) % order.length];
  player.activeBombType = nextType;
  player.grenades = player.bombs[nextType] || 0;
}

function tryPickupWeapon(player) {
  if (player.dead || matchEnded) return;

  // 1. Check Dropped Weapons on the ground first
  let bestDropIdx = -1;
  let bestDropDist = PICKUP_INTERACT_RADIUS;
  for (let i = 0; i < droppedWeapons.length; i++) {
    const dw = droppedWeapons[i];
    const d = Math.hypot(dw.x - player.x, dw.y - player.y);
    if (d < bestDropDist) {
      bestDropDist = d;
      bestDropIdx = i;
    }
  }

  if (bestDropIdx !== -1) {
    const dw = droppedWeapons[bestDropIdx];
    droppedWeapons.splice(bestDropIdx, 1);
    equipPickedWeapon(player, dw.weaponId, dw.mag, dw.reserve, dw.x, dw.y);
    return;
  }

  // 2. Check Map Weapon & Supply Spawn Pads
  let bestPad = null;
  let bestPadDist = PICKUP_INTERACT_RADIUS;
  for (let i = 0; i < mapPadsState.length; i++) {
    const pad = mapPadsState[i];
    if (!pad.active) continue;
    const d = Math.hypot(pad.x - player.x, pad.y - player.y);
    if (d < bestPadDist) {
      bestPadDist = d;
      bestPad = pad;
    }
  }

  if (bestPad) {
    if (RESOURCES[bestPad.weaponId]) {
      bestPad.active = false;
      bestPad.respawnTimer = bestPad.respawnTime || PICKUP_RESPAWN_TIME;
      if (bestPad.weaponId === RESOURCE_IDS.GRENADE_CRATE) {
        player.bombs[BOMB_IDS.FRAG] = Math.min(MAX_GRENADES, (player.bombs[BOMB_IDS.FRAG] || 0) + 2);
        player.activeBombType = BOMB_IDS.FRAG;
      } else if (bestPad.weaponId === RESOURCE_IDS.GAS_CRATE) {
        player.bombs[BOMB_IDS.GAS] = Math.min(MAX_GRENADES, (player.bombs[BOMB_IDS.GAS] || 0) + 2);
        player.activeBombType = BOMB_IDS.GAS;
      } else if (bestPad.weaponId === RESOURCE_IDS.MINE_CRATE) {
        player.bombs[BOMB_IDS.MINE] = Math.min(MAX_GRENADES, (player.bombs[BOMB_IDS.MINE] || 0) + 2);
        player.activeBombType = BOMB_IDS.MINE;
      } else if (bestPad.weaponId === RESOURCE_IDS.AMMO_CRATE) {
        for (let s = 0; s < 2; s++) {
          const sw = getWeapon(player.slots[s].id);
          if (!sw.isMelee) {
            player.slots[s].mag = sw.magSize;
            player.slots[s].reserve = sw.reserveAmmo * 2;
          }
        }
        player.bombs[BOMB_IDS.FRAG] = Math.min(MAX_GRENADES, (player.bombs[BOMB_IDS.FRAG] || 0) + 1);
      } else if (bestPad.weaponId === RESOURCE_IDS.MEDKIT_PACK) {
        player.health = Math.min(MAX_HEALTH, player.health + 50);
      }
      syncPlayerGrenadesCount(player);
      pendingEvents.push([EVT_PICKUP, player.id, bestPad.weaponId, round1(bestPad.x), round1(bestPad.y)]);
      return;
    }

    const w = getWeapon(bestPad.weaponId);
    bestPad.active = false;
    bestPad.respawnTimer = bestPad.respawnTime || (w.isRare ? RARE_WEAPON_RESPAWN_TIME : PICKUP_RESPAWN_TIME);
    player.bombs[BOMB_IDS.FRAG] = Math.min(MAX_GRENADES, (player.bombs[BOMB_IDS.FRAG] || 0) + 1);
    syncPlayerGrenadesCount(player);
    equipPickedWeapon(player, w.id, w.magSize, w.reserveAmmo, bestPad.x, bestPad.y);
  }
}

function equipPickedWeapon(player, weaponId, mag, reserve, px, py) {
  const w = getWeapon(weaponId);

  for (let s = 0; s < 2; s++) {
    if (player.slots[s].id === weaponId) {
      player.slots[s].mag = w.magSize;
      player.slots[s].reserve = Math.min(w.reserveAmmo * 2, player.slots[s].reserve + reserve);
      player.activeSlot = s;
      player.activeWeaponId = weaponId;
      player.reloading = false;
      pendingEvents.push([EVT_PICKUP, player.id, weaponId, round1(px), round1(py)]);
      return;
    }
  }

  if (player.slots[1].id === WEAPON_IDS.MACHETE) {
    player.slots[1] = { id: weaponId, mag, reserve };
    player.activeSlot = 1;
    player.activeWeaponId = weaponId;
  } else {
    const oldSlot = player.slots[player.activeSlot];
    if (oldSlot.id !== WEAPON_IDS.MACHETE && (oldSlot.mag > 0 || oldSlot.reserve > 0)) {
      spawnDroppedWeapon(oldSlot.id, player.x, player.y - 6, oldSlot.mag, oldSlot.reserve);
    }
    player.slots[player.activeSlot] = { id: weaponId, mag, reserve };
    player.activeWeaponId = weaponId;
  }

  player.reloading = false;
  player.reloadTimer = 0;
  player.fireCooldown = 0.2;
  pendingEvents.push([EVT_PICKUP, player.id, weaponId, round1(px), round1(py)]);
}

function spawnDroppedWeapon(weaponId, x, y, mag, reserve) {
  if (weaponId === WEAPON_IDS.MACHETE) return;
  droppedWeapons.push({
    id: nextEntityId++,
    weaponId,
    x,
    y,
    vx: (Math.random() - 0.5) * 140,
    vy: -180,
    mag,
    reserve,
    life: DROPPED_WEAPON_LIFETIME
  });
}

function detonateProxyMine(mineObj, destroyerId, nowSec) {
  const idx = activeGrenades.indexOf(mineObj);
  if (idx !== -1) {
    activeGrenades.splice(idx, 1);
  }
  pendingEvents.push([EVT_MINE_TRIGGER, round1(mineObj.x), round1(mineObj.y)]);
  triggerExplosion(
    mineObj.x,
    mineObj.y,
    PROXY_MINE_BLAST_RADIUS,
    PROXY_MINE_MAX_DAMAGE,
    destroyerId || mineObj.ownerId,
    RESOURCE_IDS.MINE_CRATE,
    nowSec
  );
}

function raycastProxyMines(x1, y1, x2, y2, shooterId, maxT = 1.0) {
  const endX = x1 + (x2 - x1) * maxT;
  const endY = y1 + (y2 - y1) * maxT;
  const hitRadius = 11.5;
  let bestT = maxT + 0.05;
  let bestHit = null;

  for (let i = 0; i < activeGrenades.length; i++) {
    const g = activeGrenades[i];
    if (g.bombType !== BOMB_IDS.MINE) continue;
    // Brief grace window right as the planter throws the mine so muzzle doesn't clip it at t=0
    if (g.ownerId === shooterId && !g.stuck && (PROXY_MINE_LIFETIME - g.fuse) < 0.18) continue;

    const cp = closestPointOnSegment(g.x, g.y, x1, y1, endX, endY);
    const dx = g.x - cp.x;
    const dy = g.y - cp.y;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      const segT = cp.t * maxT;
      if (segT <= bestT) {
        bestT = segT;
        bestHit = {
          hit: true,
          mine: g,
          x: g.x,
          y: g.y,
          t: segT
        };
      }
    }
  }

  return bestHit;
}

function executeMeleeStrike(player, nowSec) {
  if (player.dead || player.meleeCooldown > 0 || matchEnded) return;
  player.meleeCooldown = 0.38;
  player.spawnShield = 0;

  const angle = player.aimAngle;
  player.vx += Math.cos(angle) * 95;
  player.vy += Math.sin(angle) * 45;

  pendingEvents.push([
    EVT_MELEE,
    player.id,
    round1(player.x),
    round1(player.y),
    round2(angle)
  ]);

  const meleeRange = 58;
  const playersArr = Array.from(players.values());
  for (let i = 0; i < playersArr.length; i++) {
    const target = playersArr[i];
    if (target.id === player.id || target.dead) continue;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= meleeRange + PLAYER_RADIUS) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) <= 0.95 || dist < 26) {
        const wallCheck = raycastMap(player.x, player.y, target.x, target.y, COMPILED_MAP);
        if (!wallCheck.hit) {
          target.vx += Math.cos(angle) * 260;
          target.vy -= 120;
          applyDamage(target, player, 60, WEAPON_IDS.MACHETE, target.x, target.y, false, nowSec);
        }
      }
    }
  }

  // Allow melee strikes to destroy/detonate Proxy Mines in range
  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    const g = activeGrenades[i];
    if (!g || g.bombType !== BOMB_IDS.MINE) continue;
    const dx = g.x - player.x;
    const dy = g.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= meleeRange + 12) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= 0.95 || dist < 26) {
        detonateProxyMine(g, player.id, nowSec);
      }
    }
  }
}

function throwFragGrenade(player) {
  if (player.dead || player.grenadeCooldown > 0 || matchEnded) return;
  syncPlayerGrenadesCount(player);
  const bType = player.activeBombType || BOMB_IDS.FRAG;
  if ((player.bombs[bType] || 0) <= 0) return;

  player.bombs[bType]--;
  syncPlayerGrenadesCount(player);
  player.grenadeCooldown = 0.65;
  player.spawnShield = 0;

  const angle = player.aimAngle;
  const gx = player.x + Math.cos(angle) * 18;
  const gy = player.y - 4 + Math.sin(angle) * 18;

  const isMine = bType === BOMB_IDS.MINE;
  const isGas = bType === BOMB_IDS.GAS;
  const throwSpd = isMine ? GRENADE_THROW_SPEED * 0.78 : GRENADE_THROW_SPEED;

  activeGrenades.push({
    id: nextEntityId++,
    ownerId: player.id,
    bombType: bType,
    isSticky: isMine,
    stuck: false,
    nx: 0,
    ny: -1,
    armTimer: isMine ? PROXY_MINE_ARM_TIME : 0,
    ownerGraceTimer: isMine ? 1.75 : 0,
    ownerLeftRadius: false,
    x: gx,
    y: gy,
    vx: player.vx * 0.35 + Math.cos(angle) * throwSpd,
    vy: player.vy * 0.25 + Math.sin(angle) * throwSpd - (isMine ? 25 : 55),
    fuse: isGas ? GAS_GRENADE_FUSE : (isMine ? PROXY_MINE_LIFETIME : GRENADE_FUSE)
  });

  pendingEvents.push([EVT_GRENADE_THROW, player.id, round1(gx), round1(gy), bType]);
}

function fireEquippedWeapon(player, nowSec) {
  if (player.dead || player.fireCooldown > 0 || player.reloading || matchEnded) return;

  const slot = player.slots[player.activeSlot];
  const weapon = getWeapon(slot.id);

  if (weapon.isMelee) {
    executeMeleeStrike(player, nowSec);
    return;
  }

  if (slot.mag <= 0) {
    startReload(player);
    return;
  }

  slot.mag--;
  player.fireCooldown = weapon.fireInterval;
  player.spawnShield = 0;
  player.lastFireTime = nowSec;

  const angle = player.aimAngle;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const shoulderX = player.x;
  const shoulderY = player.crouched ? (player.y + 3) : (player.y - 3);
  let muzzleX = shoulderX + cosA * weapon.barrelLength;
  let muzzleY = shoulderY + sinA * weapon.barrelLength;

  const barrelCheck = raycastMap(shoulderX, shoulderY, muzzleX, muzzleY, COMPILED_MAP);
  if (barrelCheck.hit) {
    muzzleX = barrelCheck.x - cosA * 3;
    muzzleY = barrelCheck.y - sinA * 3;
  }

  const recoilScale = player.grounded ? 0.52 : weapon.airRecoilMult;
  player.vx -= cosA * weapon.recoilForce * recoilScale;
  player.vy -= sinA * weapon.recoilForce * recoilScale * 0.82;

  const seed = Math.floor(Math.random() * 10000);
  pendingEvents.push([
    EVT_FIRE,
    player.id,
    weapon.id,
    round1(muzzleX),
    round1(muzzleY),
    round2(angle),
    seed
  ]);

  const pellets = weapon.pellets || 1;
  const crouchSpreadMult = (player.crouched && player.grounded && !weapon.isFlame) ? 0.72 : 1.0;
  for (let i = 0; i < pellets; i++) {
    const randVal = Math.sin(seed + i * 19.37) * 10000;
    const frac = randVal - Math.floor(randVal) - 0.5;
    const pelletAngle = angle + frac * 2 * weapon.spread * crouchSpreadMult;
    const speedVar = pellets > 1 ? (0.92 + ((i % 3) * 0.04)) : 1.0;
    const speed = weapon.bulletSpeed * speedVar;

    projectilePool.acquire(
      nextEntityId++,
      player.id,
      weapon.id,
      muzzleX,
      muzzleY,
      Math.cos(pelletAngle) * speed,
      Math.sin(pelletAngle) * speed,
      weapon.damage,
      weapon.bulletLife,
      weapon.isExplosive,
      weapon.blastRadius || 0,
      !!weapon.isFlame
    );
  }

  if (slot.mag <= 0 && slot.reserve > 0) {
    startReload(player);
  }
}

function triggerExplosion(x, y, radius, maxDamage, ownerId, weaponId, nowSec) {
  pendingEvents.push([
    EVT_EXPLOSION,
    round1(x),
    round1(y),
    Math.round(radius),
    weaponId
  ]);

  const isBombExplosion =
    weaponId === 0 ||
    weaponId === RESOURCE_IDS.MINE_CRATE ||
    weaponId === RESOURCE_IDS.GAS_CRATE;

  const owner = players.get(ownerId) || null;
  for (const target of players.values()) {
    if (target.dead) continue;
    const dx = target.x - x;
    const dy = (target.y - 2) - y;
    const dist = Math.hypot(dx, dy);

    if (dist <= radius + PLAYER_RADIUS) {
      const wallHit = raycastMap(x, y, target.x, target.y - 2, COMPILED_MAP);
      const wallFactor = wallHit.hit ? 0.42 : 1.0;

      const falloff = Math.max(0.15, 1 - dist / (radius + PLAYER_RADIUS));
      let dmg = Math.round(maxDamage * falloff * wallFactor);
      // Bombs (Frag Grenade, Proxy Mine) deal full 1.0x lethal damage to the planter too!
      if (target.id === ownerId && !isBombExplosion) {
        dmg = Math.round(dmg * 0.55);
      }

      const dirX = dist > 1 ? dx / dist : 0;
      const dirY = dist > 1 ? dy / dist : -1;
      const impulse = GRENADE_KNOCKBACK * falloff * wallFactor;
      target.vx += dirX * impulse;
      target.vy += dirY * impulse - 90 * falloff;
      target.grounded = false;

      if (dmg > 0) {
        applyDamage(target, owner, dmg, weaponId, target.x, target.y, false, nowSec);
      }
    }
  }

  // Chain-destroy any other active Proxy Mines caught inside the blast radius
  const chainMines = [];
  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    const g = activeGrenades[i];
    if (g && g.bombType === BOMB_IDS.MINE) {
      if (Math.hypot(g.x - x, g.y - y) <= radius) {
        activeGrenades.splice(i, 1);
        chainMines.push(g);
      }
    }
  }
  for (let i = 0; i < chainMines.length; i++) {
    const cm = chainMines[i];
    pendingEvents.push([EVT_MINE_TRIGGER, round1(cm.x), round1(cm.y)]);
    triggerExplosion(
      cm.x,
      cm.y,
      PROXY_MINE_BLAST_RADIUS,
      PROXY_MINE_MAX_DAMAGE,
      ownerId || cm.ownerId,
      RESOURCE_IDS.MINE_CRATE,
      nowSec
    );
  }
}

function applyDamage(target, attacker, amount, weaponId, hitX, hitY, isHeadshot, nowSec) {
  if (target.dead || matchEnded) return;
  if (target.spawnShield > 0) return;

  let finalDmg = amount;
  if (isHeadshot && weaponId !== WEAPON_IDS.SHOTGUN && weaponId !== WEAPON_IDS.RPG && weaponId !== WEAPON_IDS.FLAMETHROWER) {
    finalDmg = Math.round(amount * 1.25);
  }

  target.health = Math.max(0, target.health - finalDmg);
  target.lastDamageTime = nowSec;

  const attackerId = attacker ? attacker.id : 0;
  pendingEvents.push([
    EVT_HIT,
    target.id,
    attackerId,
    round1(hitX),
    round1(hitY),
    finalDmg,
    isHeadshot ? 1 : 0
  ]);

  if (target.health <= 0) {
    target.dead = true;
    target.crouched = false;
    target.burnTimer = 0;
    target.respawnTimer = RESPAWN_TIME; // 5.0 seconds respawn timer!
    target.deaths++;
    target.streak = 0;

    const killerName = attacker ? attacker.name : 'Explosion';
    target.lastKilledByName = killerName;

    if (attacker && attacker.id !== target.id) {
      attacker.kills++;
      attacker.streak++;
      if (attacker.streak > (attacker.bestStreak || 0)) {
        attacker.bestStreak = attacker.streak;
      }
    }

    // Drop equipped special weapon on the ground
    const activeSlotObj = target.slots[target.activeSlot];
    const secondarySlotObj = target.slots[1 - target.activeSlot];
    let dropSlot = null;
    if (activeSlotObj.id !== WEAPON_IDS.M4 && activeSlotObj.id !== WEAPON_IDS.MACHETE) {
      dropSlot = activeSlotObj;
    } else if (secondarySlotObj.id !== WEAPON_IDS.M4 && secondarySlotObj.id !== WEAPON_IDS.MACHETE) {
      dropSlot = secondarySlotObj;
    }

    if (dropSlot) {
      spawnDroppedWeapon(dropSlot.id, target.x, target.y - 8, dropSlot.mag, dropSlot.reserve);
    }

    pendingEvents.push([
      EVT_KILL,
      attackerId,
      target.id,
      weaponId,
      round1(target.x),
      round1(target.y),
      target.colorId,
      killerName
    ]);
  }
}

function killPlayerByAbyss(target) {
  if (target.dead || matchEnded) return;
  target.health = 0;
  target.dead = true;
  target.crouched = false;
  target.burnTimer = 0;
  target.respawnTimer = RESPAWN_TIME; // 5.0 seconds respawn timer
  target.deaths++;
  target.streak = 0;
  target.lastKilledByName = 'THE ABYSS';

  // Weapon ID -1 indicates automatic death by falling into the abyss
  pendingEvents.push([
    EVT_KILL,
    0,
    target.id,
    -1,
    round1(target.x),
    round1(Math.min(target.y, ABYSS_DEATH_Y - 10)),
    target.colorId,
    'THE ABYSS'
  ]);
}

// ==================== TACTICAL AI BOT CONTROLLER ====================

function isPlayerInBush(p) {
  const bushes = COMPILED_MAP.stealthBushes;
  if (!bushes) return false;
  for (let i = 0; i < bushes.length; i++) {
    const b = bushes[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) return true;
  }
  return false;
}

function updateBotAI(bot, dt) {
  if (bot.dead || matchEnded) return;

  bot.botThinkTimer -= dt;

  let closestEnemy = null;
  let closestDist = Infinity;
  let hasLineOfSight = false;
  const nowSec = performance.now() / 1000;

  for (const other of players.values()) {
    if (other.id === bot.id || other.dead) continue;
    const d = Math.hypot(other.x - bot.x, other.y - bot.y);

    // Concealment inside stealth bushes unless enemy fired recently or is very close
    if (isPlayerInBush(other) && (nowSec - (other.lastFireTime || 0)) >= 1.2 && d > 110) {
      continue;
    }

    if (d < closestDist) {
      closestDist = d;
      closestEnemy = other;
    }
  }

  const input = {
    left: false,
    right: false,
    jetpack: false,
    down: false,
    crouch: false,
    aimAngle: bot.aimAngle,
    shoot: false,
    shootPressed: false,
    grenadePressed: false,
    meleePressed: false,
    interactPressed: false,
    reloadPressed: false,
    switchSlot: -1
  };

  for (let i = 0; i < mapPadsState.length; i++) {
    const pad = mapPadsState[i];
    if (pad.active && Math.hypot(pad.x - bot.x, pad.y - bot.y) < PICKUP_INTERACT_RADIUS - 4) {
      if (bot.slots[1].id === WEAPON_IDS.MACHETE || RESOURCES[pad.weaponId]) {
        input.interactPressed = true;
      }
    }
  }

  if (closestEnemy) {
    const dx = closestEnemy.x - bot.x;
    const dy = (closestEnemy.y - 4) - (bot.y - 4);
    const targetAngle = Math.atan2(dy, dx);

    let diff = targetAngle - bot.aimAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    bot.aimAngle += diff * Math.min(1, dt * 8.5);
    input.aimAngle = bot.aimAngle;

    const wallCheck = raycastMap(bot.x, bot.y - 4, closestEnemy.x, closestEnemy.y - 4, COMPILED_MAP);
    hasLineOfSight = !wallCheck.hit;

    if (closestDist > 260) {
      if (dx > 30) input.right = true;
      else if (dx < -30) input.left = true;
    } else if (closestDist < 120) {
      if (dx > 0) input.left = true;
      else input.right = true;
    } else {
      if (Math.sin(serverTick * 0.04 + bot.id) > 0) input.right = true;
      else input.left = true;
    }

    if (dy < -55 && bot.fuel > 18) {
      input.jetpack = true;
    } else if (bot.y > 1050 && bot.fuel > 15) {
      input.jetpack = true;
    } else if (Math.abs(bot.vx) < 15 && (input.left || input.right) && bot.fuel > 30) {
      input.jetpack = true;
    }

    if (closestDist < 54 && hasLineOfSight) {
      input.meleePressed = true;
    } else if (hasLineOfSight && closestDist < 950 && Math.abs(diff) < 0.28) {
      input.shoot = true;
      input.shootPressed = true;
    } else if (!hasLineOfSight && closestDist < 480 && bot.grenades > 0 && Math.random() < 0.008) {
      input.grenadePressed = true;
    }
  } else {
    if (bot.x < 450) bot.botPatrolDir = 1;
    if (bot.x > WORLD_WIDTH - 450) bot.botPatrolDir = -1;
    if (bot.botPatrolDir > 0) input.right = true;
    else input.left = true;
    if (bot.y > 950 && bot.fuel > 25) input.jetpack = true;
  }

  bot.latestInput = input;
}

// ==================== 60HZ DETERMINISTIC SIMULATION LOOP ====================

function stepSimulation(dt, nowSec) {
  serverTick++;
  const playersArr = Array.from(players.values());

  // Count active human players
  let hasHuman = false;
  for (let i = 0; i < playersArr.length; i++) {
    if (!playersArr[i].isBot) {
      hasHuman = true;
      break;
    }
  }

  // Step Match Timer if match is running and at least 1 human is playing
  if (!matchEnded && hasHuman) {
    matchRemainingSec -= dt;
    if (matchRemainingSec <= 0) {
      matchRemainingSec = 0;
      matchEnded = true;
      const rankings = buildFinalRankings();
      const winner = rankings.length > 0 ? rankings[0] : null;
      io.emit('matchEnd', {
        winner,
        rankings,
        matchDurationSec,
        adminId: adminPlayerId
      });
    }
  }

  // If match has ended, broadcast snapshots at 30Hz so UI stays synced, but freeze combat
  if (matchEnded) {
    if (serverTick % SNAPSHOT_DIVISOR === 0) {
      broadcastCompactSnapshot();
    }
    return;
  }

  // 1. Update Map Weapon & Resource Spawn Pad Timers
  for (let i = 0; i < mapPadsState.length; i++) {
    const pad = mapPadsState[i];
    if (!pad.active) {
      pad.respawnTimer -= dt;
      if (pad.respawnTimer <= 0) {
        pad.active = true;
        pad.respawnTimer = 0;
      }
    }
  }

  // 2. Update Dropped Weapons on the Ground
  for (let i = droppedWeapons.length - 1; i >= 0; i--) {
    const dw = droppedWeapons[i];
    dw.life -= dt;
    if (dw.life <= 0 || dw.y >= ABYSS_DEATH_Y) {
      droppedWeapons.splice(i, 1);
      continue;
    }
    stepGrenadePhysics(dw, dt, COMPILED_MAP);
  }

  // 3. Step Players
  for (let i = 0; i < playersArr.length; i++) {
    const player = playersArr[i];

    if (player.dead) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        resetPlayerForRespawn(player);
      }
      continue;
    }

    if (player.spawnShield > 0) {
      player.spawnShield = Math.max(0, player.spawnShield - dt);
    }

    // Flamethrower Burn Damage-Over-Time (DoT)
    if (player.burnTimer > 0) {
      player.burnTimer = Math.max(0, player.burnTimer - dt);
      player.burnTickAccum = (player.burnTickAccum || 0) + dt;
      if (player.burnTickAccum >= 0.25) {
        player.burnTickAccum -= 0.25;
        const attacker = players.get(player.burnAttackerId) || null;
        applyDamage(player, attacker, 4, WEAPON_IDS.FLAMETHROWER, player.x, player.y, false, nowSec);
        if (player.dead) continue;
      }
    }

    if (player.health < MAX_HEALTH && (nowSec - player.lastDamageTime) >= HEALTH_REGEN_DELAY) {
      player.health = Math.min(MAX_HEALTH, player.health + HEALTH_REGEN_RATE * dt);
    }

    if (player.fireCooldown > 0) player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    if (player.grenadeCooldown > 0) player.grenadeCooldown = Math.max(0, player.grenadeCooldown - dt);
    if (player.meleeCooldown > 0) player.meleeCooldown = Math.max(0, player.meleeCooldown - dt);

    if (player.reloading) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        const slot = player.slots[player.activeSlot];
        const w = getWeapon(slot.id);
        const needed = w.magSize - slot.mag;
        const take = Math.min(needed, slot.reserve);
        slot.mag += take;
        slot.reserve -= take;
        player.reloading = false;
        player.reloadTimer = 0;
      }
    }

    if (player.isBot) {
      updateBotAI(player, dt);
      stepPlayerPhysics(player, player.latestInput, dt, COMPILED_MAP);
      if (!player.dead && player.y >= ABYSS_DEATH_Y) {
        killPlayerByAbyss(player);
        continue;
      }
      processPlayerCombatInput(player, player.latestInput, nowSec);
    } else {
      let processed = 0;
      while (player.inputQueue.length > 0 && processed < 4) {
        const inp = player.inputQueue.shift();
        player.lastSeq = inp.seq;
        player.aimAngle = inp.aimAngle;
        player.latestInput = inp;
        stepPlayerPhysics(player, inp, dt, COMPILED_MAP);
        if (!player.dead && player.y >= ABYSS_DEATH_Y) {
          killPlayerByAbyss(player);
          break;
        }
        processPlayerCombatInput(player, inp, nowSec);
        processed++;
      }
      if (processed === 0 && !player.dead) {
        stepPlayerPhysics(player, player.latestInput, dt, COMPILED_MAP);
        if (!player.dead && player.y >= ABYSS_DEATH_Y) {
          killPlayerByAbyss(player);
          continue;
        }
        processPlayerCombatInput(player, player.latestInput, nowSec);
      }
    }
  }

  // 4. Step Pooled Projectiles (Bullets, Rockets & Flame Streams)
  const activeProjs = projectilePool.activeList;
  for (let i = activeProjs.length - 1; i >= 0; i--) {
    const proj = activeProjs[i];
    proj.life -= dt;
    if (proj.life <= 0) {
      projectilePool.releaseAt(i);
      continue;
    }

    if (proj.isExplosive) {
      proj.vy += 90 * dt;
    } else if (proj.isFlame) {
      // Flame stream rises slightly and decelerates due to air drag
      proj.vy -= 45 * dt;
      proj.vx *= Math.exp(-1.5 * dt);
      proj.vy *= Math.exp(-1.5 * dt);
    }

    const nextX = proj.x + proj.vx * dt;
    const nextY = proj.y + proj.vy * dt;

    const mapHit = raycastMap(proj.x, proj.y, nextX, nextY, COMPILED_MAP);
    const maxT = mapHit.hit ? mapHit.t : 1.0;

    const mineHit = raycastProxyMines(proj.x, proj.y, nextX, nextY, proj.ownerId, maxT);
    const playerHit = raycastPlayers(proj.x, proj.y, nextX, nextY, playersArr, proj.ownerId, maxT);

    // Check if projectile hit a Proxy Mine first (destroying & detonating the mine!)
    if (mineHit && mineHit.hit && (!playerHit || !playerHit.hit || mineHit.t <= playerHit.t)) {
      pendingEvents.push([
        EVT_HIT,
        0,
        proj.ownerId,
        round1(mineHit.x),
        round1(mineHit.y),
        proj.damage,
        0
      ]);
      if (proj.isExplosive) {
        triggerExplosion(mineHit.x, mineHit.y, proj.blastRadius, proj.damage, proj.ownerId, proj.weaponId, nowSec);
      } else {
        detonateProxyMine(mineHit.mine, proj.ownerId, nowSec);
      }
      projectilePool.releaseAt(i);
      continue;
    }

    if (playerHit && playerHit.hit) {
      if (proj.isExplosive) {
        triggerExplosion(playerHit.x, playerHit.y, proj.blastRadius, proj.damage, proj.ownerId, proj.weaponId, nowSec);
      } else {
        const attacker = players.get(proj.ownerId) || null;
        const pLen = Math.hypot(proj.vx, proj.vy) || 1;
        playerHit.player.vx += (proj.vx / pLen) * (proj.isFlame ? 10 : 35);
        if (proj.isFlame) {
          playerHit.player.burnTimer = 2.5;
          playerHit.player.burnAttackerId = proj.ownerId;
        }
        applyDamage(
          playerHit.player,
          attacker,
          proj.damage,
          proj.weaponId,
          playerHit.x,
          playerHit.y,
          playerHit.headshot,
          nowSec
        );
      }
      projectilePool.releaseAt(i);
      continue;
    }

    if (mapHit.hit) {
      if (proj.isExplosive) {
        triggerExplosion(mapHit.x, mapHit.y, proj.blastRadius, proj.damage, proj.ownerId, proj.weaponId, nowSec);
      }
      projectilePool.releaseAt(i);
      continue;
    }

    proj.x = nextX;
    proj.y = nextY;
  }

  // 5. Step Active Bombs (Frag Grenades, M7 Toxic Gas Bombs, and Sticky Proxy Mines)
  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    if (i >= activeGrenades.length) continue;
    const g = activeGrenades[i];
    if (!g) continue;
    g.fuse -= dt;
    stepGrenadePhysics(g, dt, COMPILED_MAP);

    if (g.bombType === BOMB_IDS.MINE) {
      if (g.stuck && g.armTimer > 0) {
        g.armTimer = Math.max(0, g.armTimer - dt);
      }
      if (g.stuck && g.ownerGraceTimer > 0) {
        g.ownerGraceTimer = Math.max(0, g.ownerGraceTimer - dt);
      }
      const ownerPlayer = players.get(g.ownerId);
      if (ownerPlayer && !ownerPlayer.dead) {
        if (Math.hypot(ownerPlayer.x - g.x, ownerPlayer.y - g.y) > PROXY_MINE_TRIGGER_RADIUS + 8) {
          g.ownerLeftRadius = true;
        }
      }

      let mineTriggered = false;
      if (g.stuck && g.armTimer <= 0) {
        for (let pIdx = 0; pIdx < playersArr.length; pIdx++) {
          const p = playersArr[pIdx];
          if (p.dead) continue;
          // Planter can also trigger and be killed by their own mine once they leave its radius or deployment grace expires
          if (p.id === g.ownerId && !g.ownerLeftRadius && (g.ownerGraceTimer || 0) > 0) continue;
          const dist = Math.hypot(p.x - g.x, p.y - g.y);
          if (dist <= PROXY_MINE_TRIGGER_RADIUS) {
            mineTriggered = true;
            break;
          }
        }
      }
      if (mineTriggered || g.fuse <= 0 || g.y >= ABYSS_DEATH_Y) {
        activeGrenades.splice(i, 1);
        if (g.y < ABYSS_DEATH_Y) {
          pendingEvents.push([EVT_MINE_TRIGGER, round1(g.x), round1(g.y)]);
          triggerExplosion(
            g.x,
            g.y,
            PROXY_MINE_BLAST_RADIUS,
            PROXY_MINE_MAX_DAMAGE,
            g.ownerId,
            RESOURCE_IDS.MINE_CRATE,
            nowSec
          );
        }
      }
      continue;
    }

    if (g.fuse <= 0) {
      activeGrenades.splice(i, 1);
      if (g.bombType === BOMB_IDS.GAS) {
        activeGasClouds.push({
          id: nextEntityId++,
          ownerId: g.ownerId,
          x: g.x,
          y: g.y,
          radius: GAS_CLOUD_RADIUS,
          remaining: GAS_CLOUD_DURATION,
          maxDuration: GAS_CLOUD_DURATION,
          tickAccum: 0
        });
        pendingEvents.push([
          EVT_GAS_CLOUD,
          round1(g.x),
          round1(g.y),
          GAS_CLOUD_RADIUS,
          round1(GAS_CLOUD_DURATION)
        ]);
      } else {
        triggerExplosion(
          g.x,
          g.y,
          GRENADE_BLAST_RADIUS,
          GRENADE_MAX_DAMAGE,
          g.ownerId,
          0,
          nowSec
        );
      }
    }
  }

  // 5B. Step Active M7 Toxic Gas Clouds (drains health of everyone inside cloud, including planter!)
  for (let i = activeGasClouds.length - 1; i >= 0; i--) {
    const cloud = activeGasClouds[i];
    cloud.remaining -= dt;
    if (cloud.remaining <= 0) {
      activeGasClouds.splice(i, 1);
      continue;
    }
    cloud.tickAccum += dt;
    if (cloud.tickAccum >= 0.25) {
      cloud.tickAccum -= 0.25;
      const dmgPerTick = Math.round(GAS_CLOUD_DPS * 0.25);
      const owner = players.get(cloud.ownerId) || null;
      for (let pIdx = 0; pIdx < playersArr.length; pIdx++) {
        const target = playersArr[pIdx];
        if (target.dead) continue;
        const dist = Math.hypot(target.x - cloud.x, target.y - cloud.y);
        if (dist <= cloud.radius + PLAYER_RADIUS) {
          applyDamage(
            target,
            owner,
            dmgPerTick,
            RESOURCE_IDS.GAS_CRATE,
            target.x,
            target.y,
            false,
            nowSec
          );
        }
      }
    }
  }

  // 6. Broadcast Compact Tuple Snapshot at 30 Hz
  if (serverTick % SNAPSHOT_DIVISOR === 0) {
    broadcastCompactSnapshot();
  }
}

function processPlayerCombatInput(player, inp, nowSec) {
  if (inp.switchSlot === 0 || inp.switchSlot === 1 || inp.switchSlot === 2) {
    switchWeaponSlot(player, inp.switchSlot === 2 ? -1 : inp.switchSlot);
    inp.switchSlot = -1;
  } else if (inp.switchSlot >= 10 && inp.switchSlot <= 13) {
    // switchSlot 10 = cycle bomb type, 11 = FRAG, 12 = M7 GAS, 13 = PROXY MINE
    switchBombType(player, inp.switchSlot === 10 ? -1 : (inp.switchSlot - 10));
    inp.switchSlot = -1;
  }
  if (inp.interactPressed) {
    tryPickupWeapon(player);
    inp.interactPressed = false;
  }
  if (inp.reloadPressed) {
    startReload(player);
    inp.reloadPressed = false;
  }
  if (inp.meleePressed) {
    executeMeleeStrike(player, nowSec);
    inp.meleePressed = false;
  }
  if (inp.grenadePressed) {
    throwFragGrenade(player);
    inp.grenadePressed = false;
  }

  const slot = player.slots[player.activeSlot];
  const weapon = getWeapon(slot.id);
  if (weapon.automatic) {
    if (inp.shoot) {
      fireEquippedWeapon(player, nowSec);
    }
  } else {
    if (inp.shootPressed || (inp.shoot && !player.prevShoot)) {
      fireEquippedWeapon(player, nowSec);
    }
  }
  player.prevShoot = !!inp.shoot;
  inp.shootPressed = false;
}

function broadcastCompactSnapshot() {
  if (players.size === 0) return;

  const pTuples = [];
  for (const p of players.values()) {
    let flags = 0;
    if (p.jetpackActive) flags |= 1;
    if (p.grounded) flags |= 2;
    if (p.dead) flags |= 4;
    if (p.reloading) flags |= 8;
    if (p.latestInput && p.latestInput.shoot) flags |= 16;
    if (p.isBot) flags |= 32;
    if (p.crouched) flags |= 64;
    if (p.burnTimer > 0) flags |= 128;

    const reloadPct = p.reloading && p.reloadDuration > 0
      ? Math.round((1 - p.reloadTimer / p.reloadDuration) * 100)
      : 0;

    syncPlayerGrenadesCount(p);

    pTuples.push([
      p.id,                        // 0
      round1(p.x),                 // 1
      round1(p.y),                 // 2
      round1(p.vx),                // 3
      round1(p.vy),                // 4
      round2(p.aimAngle),          // 5
      Math.ceil(p.health),         // 6
      Math.round(p.fuel),          // 7
      p.activeSlot,                // 8
      p.slots[0].id,               // 9
      p.slots[0].mag,              // 10
      p.slots[0].reserve,          // 11
      p.slots[1].id,               // 12
      p.slots[1].mag,              // 13
      p.slots[1].reserve,          // 14
      p.grenades,                  // 15
      flags,                       // 16
      p.lastSeq,                   // 17
      p.kills,                     // 18
      p.deaths,                    // 19
      reloadPct,                   // 20
      round1(p.respawnTimer),      // 21
      p.spawnShield > 0 ? 1 : 0,   // 22
      p.isBot ? 0 : (p.ping || 1), // 23: real-time ping (ms)
      p.bestStreak || 0,           // 24: best kill streak
      packBombCode(p)              // 25: packed bomb counts + activeBombType
    ]);
  }

  const projTuples = [];
  const activeProjs = projectilePool.activeList;
  for (let i = 0; i < activeProjs.length; i++) {
    const b = activeProjs[i];
    projTuples.push([
      b.id,
      b.ownerId,
      b.weaponId,
      round1(b.x),
      round1(b.y),
      round1(b.vx),
      round1(b.vy)
    ]);
  }

  const grenTuples = [];
  for (let i = 0; i < activeGrenades.length; i++) {
    const g = activeGrenades[i];
    grenTuples.push([
      g.id,
      g.ownerId,
      round1(g.x),
      round1(g.y),
      round1(g.vx),
      round1(g.vy),
      round2(g.fuse),
      g.bombType || BOMB_IDS.FRAG,
      g.stuck ? 1 : 0,
      round2(g.nx || 0),
      round2(g.ny || -1),
      g.armTimer > 0 ? 1 : 0
    ]);
  }

  const padTuples = [];
  for (let i = 0; i < mapPadsState.length; i++) {
    const pad = mapPadsState[i];
    padTuples.push(pad.active ? 1 : -Math.ceil(pad.respawnTimer));
  }

  const dropTuples = [];
  for (let i = 0; i < droppedWeapons.length; i++) {
    const dw = droppedWeapons[i];
    dropTuples.push([
      dw.id,
      dw.weaponId,
      round1(dw.x),
      round1(dw.y),
      dw.mag,
      dw.reserve
    ]);
  }

  const evts = pendingEvents.length > 0 ? pendingEvents.splice(0, pendingEvents.length) : [];

  // Compact Array Payload:
  // [tick, serverTimeMs, players, projectiles, grenades, pads, drops, events, matchRemainingSec, matchEndedBit]
  const payload = [
    serverTick,
    Math.round(performance.now()),
    pTuples,
    projTuples,
    grenTuples,
    padTuples,
    dropTuples,
    evts,
    round1(matchRemainingSec),
    matchEnded ? 1 : 0
  ];

  io.volatile.emit('s', payload);
}

// ==================== SOCKET.IO CONNECTION HANDLING ====================

io.on('connection', (socket) => {
  ensureAdminAssigned();
  const currentRoster = [];
  for (const p of players.values()) {
    currentRoster.push([p.id, p.name, p.colorId, p.isBot ? 1 : 0, p.id === adminPlayerId ? 1 : 0]);
  }
  socket.emit('roster', currentRoster);
  socket.emit('matchMeta', {
    adminId: adminPlayerId,
    matchDurationSec,
    matchRemainingSec: Math.ceil(matchRemainingSec),
    matchEnded
  });

  socket.on('join', (data, ack) => {
    let existingId = socketToPlayerId.get(socket.id);
    if (existingId && players.has(existingId)) {
      players.delete(existingId);
    }

    const numericId = nextPlayerNumericId++;
    const cleanName = typeof data?.name === 'string' && data.name.trim().length > 0
      ? data.name.trim().slice(0, 16)
      : `Commander_${numericId}`;
    const colorId = Number.isInteger(data?.colorId) ? data.colorId : (numericId % 8);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId.slice(0, 48) : null;

    const player = createPlayerState(numericId, socket.id, cleanName, colorId, false, sessionId);

    // Restore session stats if player is resuming an active match!
    if (sessionId && savedSessions.has(sessionId) && !matchEnded) {
      const saved = savedSessions.get(sessionId);
      player.kills = saved.kills || 0;
      player.deaths = saved.deaths || 0;
      player.streak = saved.streak || 0;
      player.bestStreak = saved.bestStreak || 0;
      if (saved.slots) {
        player.slots = saved.slots;
        player.activeSlot = saved.activeSlot || 0;
        player.activeWeaponId = player.slots[player.activeSlot].id;
      }
      if (saved.bombs) {
        player.bombs = saved.bombs;
        player.activeBombType = saved.activeBombType || BOMB_IDS.FRAG;
        syncPlayerGrenadesCount(player);
      } else if (typeof saved.grenades === 'number') {
        player.grenades = saved.grenades;
      }
    }

    players.set(numericId, player);
    socketToPlayerId.set(socket.id, numericId);

    // Assign Admin if none exists or if this returning session was the Admin
    if (!adminPlayerId || !players.has(adminPlayerId) || (sessionId && sessionId === adminSessionId)) {
      adminPlayerId = numericId;
      adminSessionId = sessionId;
    }

    // If Admin specified a custom match duration on the Start Screen when launching the room
    if (numericId === adminPlayerId && typeof data?.matchDurationSec === 'number') {
      const dur = Math.max(30, Math.min(3600, Math.round(data.matchDurationSec)));
      let humanCount = 0;
      for (const p of players.values()) if (!p.isBot) humanCount++;
      if (humanCount === 1 || matchEnded) {
        matchDurationSec = dur;
        matchRemainingSec = dur;
        matchEnded = false;
      }
    }

    syncBotsWithHumanCount();
    broadcastRoster();

    if (matchEnded) {
      const rankings = buildFinalRankings();
      socket.emit('matchEnd', {
        winner: rankings[0] || null,
        rankings,
        matchDurationSec,
        adminId: adminPlayerId
      });
    }

    if (typeof ack === 'function') {
      ack({
        id: numericId,
        isAdmin: numericId === adminPlayerId,
        adminId: adminPlayerId,
        tick: serverTick,
        x: player.x,
        y: player.y,
        matchDurationSec,
        matchRemainingSec: Math.ceil(matchRemainingSec),
        matchEnded
      });
    }
  });

  // Compact input array from client
  socket.on('i', (arr) => {
    const pid = socketToPlayerId.get(socket.id);
    if (!pid) return;
    const player = players.get(pid);
    if (!player || !Array.isArray(arr)) return;

    const seq = arr[0] | 0;
    const mask = arr[1] | 0;
    const aimAngle = Number(arr[2]) || 0;
    const switchSlot = arr[3] !== undefined ? arr[3] : -1;

    if (player.inputQueue.length < 12) {
      player.inputQueue.push({
        seq,
        left: (mask & 1) !== 0,
        right: (mask & 2) !== 0,
        jetpack: (mask & 4) !== 0,
        down: (mask & 8) !== 0,
        shoot: (mask & 16) !== 0,
        shootPressed: (mask & 32) !== 0,
        grenadePressed: (mask & 64) !== 0,
        meleePressed: (mask & 128) !== 0,
        interactPressed: (mask & 256) !== 0,
        reloadPressed: (mask & 512) !== 0,
        crouch: (mask & 1024) !== 0,
        aimAngle,
        switchSlot
      });
    }
  });

  // Admin: Update Match Timer Duration during or before match
  socket.on('adminSetTimer', (seconds, ack) => {
    const pid = socketToPlayerId.get(socket.id);
    ensureAdminAssigned();
    if (pid && pid !== adminPlayerId) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Only Admin can set match timer' });
      return;
    }
    const dur = Math.max(30, Math.min(3600, Math.round(Number(seconds) || DEFAULT_MATCH_DURATION)));
    matchDurationSec = dur;
    matchRemainingSec = dur;
    if (matchEnded) {
      restartMatchWithDuration(dur);
    } else {
      broadcastRoster();
    }
    if (typeof ack === 'function') ack({ ok: true, matchDurationSec });
  });

  // Admin: Restart Match (after match ends or anytime from Admin Panel)
  socket.on('adminRestartMatch', (newDurationSec, ack) => {
    const pid = socketToPlayerId.get(socket.id);
    ensureAdminAssigned();
    if (pid && pid !== adminPlayerId) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Only Admin can restart the match' });
      return;
    }
    restartMatchWithDuration(newDurationSec);
    if (typeof ack === 'function') ack({ ok: true, matchDurationSec });
  });

  // Toggle practice bots on/off
  socket.on('toggleBot', (action) => {
    if (action === 'add') {
      manualBotCount = Math.min(5, manualBotCount + 1);
      autoBotEnabled = true;
    } else if (action === 'remove') {
      manualBotCount = 0;
      autoBotEnabled = false;
    } else {
      let currentBots = 0;
      for (const p of players.values()) if (p.isBot) currentBots++;
      if (currentBots > 0) {
        manualBotCount = 0;
        autoBotEnabled = false;
      } else {
        manualBotCount = 1;
        autoBotEnabled = true;
      }
    }
    syncBotsWithHumanCount();
  });

  // Low-overhead ping measurement & synchronization for Tab Scoreboard
  socket.on('p', (clientTs, arg2, arg3) => {
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    const reportedPing = typeof arg2 === 'number' ? arg2 : null;
    if (reportedPing !== null && !Number.isNaN(reportedPing)) {
      const pid = socketToPlayerId.get(socket.id);
      const p = pid ? players.get(pid) : null;
      if (p && !p.isBot) {
        p.ping = Math.max(1, Math.min(999, Math.round(reportedPing)));
      }
    }
    if (typeof cb === 'function') cb(clientTs);
  });

  socket.on('disconnect', () => {
    const pid = socketToPlayerId.get(socket.id);
    if (pid) {
      const p = players.get(pid);
      if (p && p.sessionId && !matchEnded) {
        // Save session stats so player can resume & continue the match if they reconnect!
        savedSessions.set(p.sessionId, {
          kills: p.kills,
          deaths: p.deaths,
          streak: p.streak,
          bestStreak: p.bestStreak,
          slots: p.slots,
          activeSlot: p.activeSlot,
          bombs: p.bombs,
          activeBombType: p.activeBombType,
          grenades: p.grenades
        });
      }
      players.delete(pid);
      socketToPlayerId.delete(socket.id);
      ensureAdminAssigned();
      syncBotsWithHumanCount();
      broadcastRoster();
    }
  });
});

// ==================== HIGH-PRECISION 60HZ FIXED TIMESTEP LOOP ====================

let lastSimTime = performance.now();
let accumulator = 0;

function startAuthoritativeLoop() {
  setInterval(() => {
    const now = performance.now();
    let frameDt = (now - lastSimTime) / 1000;
    lastSimTime = now;

    if (frameDt > 0.25) frameDt = 0.25;
    accumulator += frameDt;

    const nowSec = now / 1000;
    while (accumulator >= TICK_DT) {
      stepSimulation(TICK_DT, nowSec);
      accumulator -= TICK_DT;
    }
  }, 4);
}

// ==================== SERVER STARTUP & LAN IP DISCOVERY ====================

function getLocalLanIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ interface: name, address: net.address });
      }
    }
  }
  return ips;
}

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const lanIPs = getLocalLanIPs();
  console.log('\n====================================================================');
  console.log('  MINI MILITIA PC & MOBILE: OUTPOST - 60Hz AUTHORITATIVE SERVER');
  console.log('====================================================================');
  console.log(`  Local Host URL:       http://localhost:${PORT}`);
  if (lanIPs.length > 0) {
    for (const item of lanIPs) {
      console.log(`  LAN Network URL:      http://${item.address}:${PORT}  (${item.interface})`);
    }
  } else {
    console.log('  LAN Network URL:      (No active external IPv4 interface detected)');
  }
  console.log('--------------------------------------------------------------------');
  console.log('  Tunnel Play (Play over the Internet on PC or Mobile Browser):');
  console.log(`    Option 1: npx localtunnel --port ${PORT}`);
  console.log(`    Option 2: cloudflared tunnel --url http://localhost:${PORT}`);
  console.log('====================================================================\n');

  startAuthoritativeLoop();
});
