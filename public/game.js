// Mini Militia PC & Mobile: Outpost - 60-144Hz Crossplay Client Engine
// Features:
// - PC Mouse/KB + Mobile Twin-Stick Multi-Touch Controls
// - Client-Side Prediction, Server Reconciliation & Entity Interpolation
// - Admin Match Timer, End-of-Match Player Rankings (Highest Kills Winner) & Admin Restart
// - 5-Second Respawn Timer with Killer's Name Display
// - In-Match Pause / Resume & Automatic Session Reconnect

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TICK_DT,
  BASE_CAMERA_ZOOM,
  SNIPER_FOV_MIN_MULT,
  SNIPER_FOV_MAX_MULT,
  SNIPER_FOV_DEFAULT_MULT,
  PLAYER_RADIUS,
  MAX_HEALTH,
  HEALTH_REGEN_DELAY,
  RESPAWN_TIME,
  DEFAULT_MATCH_DURATION,
  JETPACK_FUEL_MAX,
  PICKUP_INTERACT_RADIUS,
  RESOURCE_IDS,
  BOMB_IDS,
  SOLDIER_COLORS,
  EVT_FIRE,
  EVT_EXPLOSION,
  EVT_HIT,
  EVT_KILL,
  EVT_MELEE,
  EVT_PICKUP,
  EVT_GRENADE_THROW,
  EVT_RELOAD,
  EVT_GAS_CLOUD,
  EVT_MINE_TRIGGER
} from '/shared/constants.js';
import { WEAPON_IDS, RESOURCES, BOMB_META, getWeapon, getPickupInfo } from '/shared/weapons.js';
import { COMPILED_MAP, MAP_WEAPON_PADS, STEALTH_BUSHES } from '/shared/map.js';
import { stepPlayerPhysics, raycastMap } from '/shared/physics.js';
import { ObjectPool } from '/shared/pool.js';
import { OutpostMapRenderer } from '/mapRenderer.js';
import { soundFX } from '/audio.js';

// ==================== DOM & CANVAS REFERENCES ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const startScreen = document.getElementById('startScreen');
const hudOverlay = document.getElementById('hudOverlay');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const previewColorName = document.getElementById('previewColorName');
const playerNameInput = document.getElementById('playerNameInput');
const colorSwatchesEl = document.getElementById('colorSwatches');
const startMatchDurationSelect = document.getElementById('startMatchDurationSelect');
const joinBtn = document.getElementById('joinBtn');
const startOpenSettingsBtn = document.getElementById('startOpenSettingsBtn');

// Top-Center Match Timer, Tab Scoreboard, Settings & Menu Controls
const matchTimerDisplay = document.getElementById('matchTimerDisplay');
const adminRoleBadge = document.getElementById('adminRoleBadge');
const openTabScoreBtn = document.getElementById('openTabScoreBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const openPauseMenuBtn = document.getElementById('openPauseMenuBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// HUD Vitals & Loadout
const hpBarFill = document.getElementById('hpBarFill');
const hpDamageTrail = document.getElementById('hpDamageTrail');
const hpValueText = document.getElementById('hpValueText');
const hpStatusTag = document.getElementById('hpStatusTag');
const stealthStatusTag = document.getElementById('stealthStatusTag');
const crouchStatusTag = document.getElementById('crouchStatusTag');
const fuelBarFill = document.getElementById('fuelBarFill');
const fuelValueText = document.getElementById('fuelValueText');
const weightPenaltyTag = document.getElementById('weightPenaltyTag');

const weaponSlot0El = document.getElementById('weaponSlot0');
const weaponSlot1El = document.getElementById('weaponSlot1');
const weaponIcon0 = document.getElementById('weaponIcon0');
const weaponIcon1 = document.getElementById('weaponIcon1');
const weaponName0 = document.getElementById('weaponName0');
const weaponName1 = document.getElementById('weaponName1');
const ammoMagEl = document.getElementById('ammoMag');
const ammoReserveEl = document.getElementById('ammoReserve');
const reloadBadge = document.getElementById('reloadBadge');
const reloadBarFill = document.getElementById('reloadBarFill');
const grenadeIconsRow = document.getElementById('grenadeIconsRow');
const activeBombLabel = document.getElementById('activeBombLabel');
const cycleBombBtn = document.getElementById('cycleBombBtn');
const bombPill1 = document.getElementById('bombPill1');
const bombPill2 = document.getElementById('bombPill2');
const bombPill3 = document.getElementById('bombPill3');
const bombCount1 = document.getElementById('bombCount1');
const bombCount2 = document.getElementById('bombCount2');
const bombCount3 = document.getElementById('bombCount3');

// Sniper-Only FOV HUD Controls
const sniperFovPanel = document.getElementById('sniperFovPanel');
const sniperFovSlider = document.getElementById('sniperFovSlider');
const sniperFovValue = document.getElementById('sniperFovValue');

const leaderboardList = document.getElementById('leaderboardList');
const killFeedEl = document.getElementById('killFeed');
const pickupPrompt = document.getElementById('pickupPrompt');
const pickupWeaponName = document.getElementById('pickupWeaponName');

// 5-Second Respawn Banner with Killer's Name
const respawnBanner = document.getElementById('respawnBanner');
const respawnKillerName = document.getElementById('respawnKillerName');
const respawnWeaponUsed = document.getElementById('respawnWeaponUsed');
const respawnCountdown = document.getElementById('respawnCountdown');
const respawnProgressBar = document.getElementById('respawnProgressBar');

// Mobile Twin-Stick Touch Elements
const mobileControlsEl = document.getElementById('mobileControls');
const leftJoystickZone = document.getElementById('leftJoystickZone');
const leftJoystickBase = document.getElementById('leftJoystickBase');
const leftJoystickKnob = document.getElementById('leftJoystickKnob');
const rightJoystickZone = document.getElementById('rightJoystickZone');
const rightJoystickBase = document.getElementById('rightJoystickBase');
const rightJoystickKnob = document.getElementById('rightJoystickKnob');
const mobileJetBtn = document.getElementById('mobileJetBtn');
const mobileCrouchBtn = document.getElementById('mobileCrouchBtn');
const mobileFireBtn = document.getElementById('mobileFireBtn');
const mobileGrenadeBtn = document.getElementById('mobileGrenadeBtn');
const mobileBombSwitchBtn = document.getElementById('mobileBombSwitchBtn');
const mobileBombIcon = document.getElementById('mobileBombIcon');
const mobileBombLabel = document.getElementById('mobileBombLabel');
const mobileMeleeBtn = document.getElementById('mobileMeleeBtn');
const mobileReloadBtn = document.getElementById('mobileReloadBtn');
const mobileSwapBtn = document.getElementById('mobileSwapBtn');
const mobilePickupBtn = document.getElementById('mobilePickupBtn');
const mobileRightActionsEl = document.querySelector('.mobile-right-actions');

// Bottom-Right Telemetry & Quick Buttons
const fpsCounterEl = document.getElementById('fpsCounter');
const pingCounterEl = document.getElementById('pingCounter');
const pingDotEl = document.getElementById('pingDot');
const toggleTouchBtn = document.getElementById('toggleTouchBtn');
const touchBtnLabel = document.getElementById('touchBtnLabel');
const toggleBotBtn = document.getElementById('toggleBotBtn');
const botBtnLabel = document.getElementById('botBtnLabel');
const toggleMuteBtn = document.getElementById('toggleMuteBtn');
const muteBtnLabel = document.getElementById('muteBtnLabel');
const radarCanvas = document.getElementById('radarCanvas');
const radarCardEl = document.querySelector('.radar-card');
const radarCtx = radarCanvas.getContext('2d');

// Pause / Resume & Admin Modal Elements
const pauseModal = document.getElementById('pauseModal');
const pauseAdminBadge = document.getElementById('pauseAdminBadge');
const resumeGameBtn = document.getElementById('resumeGameBtn');
const pauseOpenSettingsBtn = document.getElementById('pauseOpenSettingsBtn');
const adminPauseSection = document.getElementById('adminPauseSection');
const adminDurationInput = document.getElementById('adminDurationInput');
const adminApplyTimerBtn = document.getElementById('adminApplyTimerBtn');
const adminForceRestartBtn = document.getElementById('adminForceRestartBtn');

// Settings Modal Elements (PC & Mobile)
const settingsModal = document.getElementById('settingsModal');
const closeSettingsHeaderBtn = document.getElementById('closeSettingsHeaderBtn');
const saveCloseSettingsBtn = document.getElementById('saveCloseSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const setAimSensitivity = document.getElementById('setAimSensitivity');
const valAimSensitivity = document.getElementById('valAimSensitivity');
const setTouchSensitivity = document.getElementById('setTouchSensitivity');
const valTouchSensitivity = document.getElementById('valTouchSensitivity');
const setTouchScale = document.getElementById('setTouchScale');
const valTouchScale = document.getElementById('valTouchScale');
const setTouchOpacity = document.getElementById('setTouchOpacity');
const valTouchOpacity = document.getElementById('valTouchOpacity');
const setMobileAutoFire = document.getElementById('setMobileAutoFire');
const setShowCrosshair = document.getElementById('setShowCrosshair');
const setMasterVolume = document.getElementById('setMasterVolume');
const valMasterVolume = document.getElementById('valMasterVolume');
const setSfxVolume = document.getElementById('setSfxVolume');
const valSfxVolume = document.getElementById('valSfxVolume');
const setJetpackVolume = document.getElementById('setJetpackVolume');
const valJetpackVolume = document.getElementById('valJetpackVolume');
const setMuteAudio = document.getElementById('setMuteAudio');
const testAudioBtn = document.getElementById('testAudioBtn');
const setScreenShake = document.getElementById('setScreenShake');
const valScreenShake = document.getElementById('valScreenShake');
const setParticleQuality = document.getElementById('setParticleQuality');
const setShowDamageNums = document.getElementById('setShowDamageNums');
const setShowRadar = document.getElementById('setShowRadar');

// Live Tab Scoreboard Modal Elements
const tabScoreboardModal = document.getElementById('tabScoreboardModal');
const tabScoreboardBody = document.getElementById('tabScoreboardBody');
const closeTabScoreBtn = document.getElementById('closeTabScoreBtn');

// End-of-Match Rankings Modal Elements
const matchEndModal = document.getElementById('matchEndModal');
const winnerHeadline = document.getElementById('winnerHeadline');
const winnerSubline = document.getElementById('winnerSubline');
const finalRankingsBody = document.getElementById('finalRankingsBody');
const adminEndControls = document.getElementById('adminEndControls');
const endNextDurationSelect = document.getElementById('endNextDurationSelect');
const adminEndRestartBtn = document.getElementById('adminEndRestartBtn');
const nonAdminEndWait = document.getElementById('nonAdminEndWait');

// ==================== BAKE PROCEDURAL OUTPOST MAP ====================
const mapRenderer = new OutpostMapRenderer();
mapRenderer.bake();

// ==================== CLIENT OBJECT POOLS (ZERO GC LAG) ====================

const particlePool = new ObjectPool(
  () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    size: 4, endSize: 0.5,
    color: '#fff', alpha: 1,
    life: 0, maxLife: 0.5,
    gravity: 0, glow: false, outlined: false
  }),
  (p, x, y, vx, vy, size, endSize, color, maxLife, gravity = 0, glow = false, outlined = false) => {
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.size = size; p.endSize = endSize;
    p.color = color; p.alpha = 1;
    p.life = 0; p.maxLife = maxLife;
    p.gravity = gravity; p.glow = glow;
    p.outlined = outlined;
  },
  700
);

const casingPool = new ObjectPool(
  () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    angle: 0, vAngle: 0,
    life: 0, maxLife: 1.8,
    color: '#f1c40f', length: 6
  }),
  (c, x, y, vx, vy, color = '#f1c40f', length = 6) => {
    c.x = x; c.y = y; c.vx = vx; c.vy = vy;
    c.angle = Math.random() * Math.PI * 2;
    c.vAngle = (Math.random() - 0.5) * 28;
    c.life = 0; c.maxLife = 1.6;
    c.color = color; c.length = length;
  },
  160
);

let nextRocketAudioId = 1;
const tracerPool = new ObjectPool(
  () => ({
    x: 0, y: 0, prevX: 0, prevY: 0,
    vx: 0, vy: 0,
    weaponId: 1, color: '#ffeaa7', width: 2.2,
    life: 0, maxLife: 0.5, isRocket: false, isFlame: false, loopId: 0
  }),
  (t, x, y, vx, vy, weaponId, maxLife) => {
    const w = getWeapon(weaponId);
    t.x = x; t.y = y;
    t.prevX = x; t.prevY = y;
    t.vx = vx; t.vy = vy;
    t.weaponId = weaponId;
    t.color = w.tracerColor || '#ffeaa7';
    t.width = w.tracerWidth || 2.2;
    t.life = 0;
    t.maxLife = maxLife;
    t.isRocket = !!w.isExplosive;
    t.isFlame = !!w.isFlame;
    t.loopId = t.isRocket ? (nextRocketAudioId++) : 0;
  },
  320
);

const floatingTextPool = new ObjectPool(
  () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    text: '', color: '#fff', size: 15,
    life: 0, maxLife: 0.85
  }),
  (ft, x, y, text, color = '#ff4757', size = 15) => {
    ft.x = x + (Math.random() - 0.5) * 14;
    ft.y = y;
    ft.vx = (Math.random() - 0.5) * 28;
    ft.vy = -68;
    ft.text = text;
    ft.color = color;
    ft.size = size;
    ft.life = 0;
    ft.maxLife = 0.85;
  },
  64
);

const activeMuzzleFlashes = [];
const activeExplosions = [];
const activeGasClouds = [];
const activeMeleeSlashes = [];
const activeRagdolls = [];
const directionalHitIndicators = [];

// ==================== NETWORK, SESSION & MATCH STATE ====================
const socket = window.io({
  transports: ['websocket'],
  upgrade: false
});

function getOrCreateSessionId() {
  let sid = localStorage.getItem('mm_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('mm_session_id', sid);
  }
  return sid;
}

const mySessionId = getOrCreateSessionId();
let myPlayerId = null;
let joinedGame = false;
let isPausedMenuOpen = false;
let isSettingsModalOpen = false;
let isTabScoreboardOpen = false;
let tabKeyDownTime = 0;
let selectedColorId = Math.floor(Math.random() * SOLDIER_COLORS.length);

// Default User Settings (PC & Mobile)
const DEFAULT_USER_SETTINGS = {
  aimSensitivity: 1.0,
  touchSensitivity: 1.0,
  touchScale: 100,
  touchOpacity: 85,
  mobileAutoFire: true,
  showCrosshair: true,
  masterVolume: 85,
  sfxVolume: 100,
  jetpackVolume: 80,
  muted: false,
  screenShake: 100,
  particleQuality: 1.0,
  showDamageNums: true,
  showRadar: true
};

let userSettings = loadUserSettings();

function loadUserSettings() {
  try {
    const raw = localStorage.getItem('mm_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USER_SETTINGS, ...parsed };
    }
  } catch (_e) {
    // Ignore storage error
  }
  return { ...DEFAULT_USER_SETTINGS };
}

function saveUserSettings() {
  try {
    localStorage.setItem('mm_user_settings', JSON.stringify(userSettings));
  } catch (_e) {
    // Ignore storage error
  }
}

function syncSettingsControlsFromState() {
  setAimSensitivity.value = userSettings.aimSensitivity.toFixed(2);
  valAimSensitivity.textContent = `${userSettings.aimSensitivity.toFixed(2)}x`;

  setTouchSensitivity.value = userSettings.touchSensitivity.toFixed(2);
  valTouchSensitivity.textContent = `${userSettings.touchSensitivity.toFixed(2)}x`;

  setTouchScale.value = String(userSettings.touchScale);
  valTouchScale.textContent = `${userSettings.touchScale}%`;

  setTouchOpacity.value = String(userSettings.touchOpacity);
  valTouchOpacity.textContent = `${userSettings.touchOpacity}%`;

  setMobileAutoFire.checked = !!userSettings.mobileAutoFire;
  setShowCrosshair.checked = !!userSettings.showCrosshair;

  setMasterVolume.value = String(userSettings.masterVolume);
  valMasterVolume.textContent = `${userSettings.masterVolume}%`;

  setSfxVolume.value = String(userSettings.sfxVolume);
  valSfxVolume.textContent = `${userSettings.sfxVolume}%`;

  setJetpackVolume.value = String(userSettings.jetpackVolume);
  valJetpackVolume.textContent = `${userSettings.jetpackVolume}%`;

  setMuteAudio.checked = !!userSettings.muted;

  setScreenShake.value = String(userSettings.screenShake);
  valScreenShake.textContent = `${userSettings.screenShake}%`;

  setParticleQuality.value = String(userSettings.particleQuality);
  setShowDamageNums.checked = !!userSettings.showDamageNums;
  setShowRadar.checked = !!userSettings.showRadar;
}

function applyUserSettingsToEngine() {
  soundFX.setMasterVolume(userSettings.masterVolume / 100);
  soundFX.setSfxVolume(userSettings.sfxVolume / 100);
  soundFX.setJetpackVolume(userSettings.jetpackVolume / 100);
  soundFX.setMuted(!!userSettings.muted);
  muteBtnLabel.textContent = userSettings.muted ? 'Audio: MUTED' : 'Audio: ON';

  // Apply Mobile Controls Opacity & Scale
  mobileControlsEl.style.opacity = String(userSettings.touchOpacity / 100);
  const scaleFactor = userSettings.touchScale / 100;
  leftJoystickZone.style.transform = `scale(${scaleFactor})`;
  leftJoystickZone.style.transformOrigin = 'bottom left';
  rightJoystickZone.style.transform = `scale(${scaleFactor})`;
  rightJoystickZone.style.transformOrigin = 'bottom right';
  mobileJetBtn.style.transform = `scale(${scaleFactor})`;
  mobileJetBtn.style.transformOrigin = 'bottom left';
  if (mobileCrouchBtn) {
    mobileCrouchBtn.style.transform = `scale(${scaleFactor})`;
    mobileCrouchBtn.style.transformOrigin = 'bottom left';
  }
  if (mobileRightActionsEl) {
    mobileRightActionsEl.style.transform = `scale(${scaleFactor})`;
    mobileRightActionsEl.style.transformOrigin = 'bottom right';
  }

  // Apply Radar Visibility
  if (radarCardEl) {
    radarCardEl.classList.toggle('hidden', !userSettings.showRadar);
  }
}

// Admin & Match Clock State
let currentAdminId = null;
let isLocalAdmin = false;
let matchDurationSec = DEFAULT_MATCH_DURATION;
let matchRemainingSec = DEFAULT_MATCH_DURATION;
let matchEnded = false;

// Sniper-Only FOV Multiplier
let userSniperFovMult = SNIPER_FOV_DEFAULT_MULT;

// Mobile / Touch Detection & Mode
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 900);
let touchMode = isTouchDevice ? 'on' : 'off'; // 'on' | 'off'

// ==================== PC MOUSE CONFINEMENT (POINTER LOCK) ====================
let pointerLockRequestedByGame = false;

function isPointerLocked() {
  return document.pointerLockElement === canvas;
}

function shouldAllowPointerLock() {
  return (
    joinedGame &&
    touchMode !== 'on' &&
    !isPausedMenuOpen &&
    !isSettingsModalOpen &&
    !isTabScoreboardOpen &&
    !matchEnded
  );
}

function engagePointerLock() {
  if (!shouldAllowPointerLock()) return;
  if (!isPointerLocked() && canvas.requestPointerLock) {
    try {
      pointerLockRequestedByGame = true;
      const res = canvas.requestPointerLock();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (_e) {
      // Ignore pointer lock rejection
    }
  }
}

function releasePointerLock() {
  pointerLockRequestedByGame = false;
  if (isPointerLocked() && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch (_e) {
      // Ignore
    }
  }
}

document.addEventListener('pointerlockchange', () => {
  const locked = isPointerLocked();
  canvas.classList.toggle('pointer-locked', locked);
  if (!locked) {
    mouse.leftDown = false;
    // If the user pressed ESC while playing to release the cursor, open the Pause Menu so they have full cursor freedom
    if (
      pointerLockRequestedByGame &&
      joinedGame &&
      touchMode !== 'on' &&
      !isPausedMenuOpen &&
      !isSettingsModalOpen &&
      !isTabScoreboardOpen &&
      !matchEnded
    ) {
      setPauseModalOpen(true);
    }
    pointerLockRequestedByGame = false;
  }
});

// ==================== STEALTH BUSH HELPER ====================
function getBushContainingPoint(x, y) {
  for (let i = 0; i < STEALTH_BUSHES.length; i++) {
    const b = STEALTH_BUSHES[i];
    const dx = (x - b.x) / (b.rx * 0.92);
    const dy = (y - (b.y - b.ry * 0.35)) / (b.ry * 1.05);
    if (dx * dx + dy * dy <= 1.0) {
      return b;
    }
  }
  return null;
}

const playerRoster = new Map();
const remotePlayers = new Map();
const INTERP_BUFFER_MS = 68;

const localPlayer = {
  id: 0,
  x: 930,
  y: 465,
  vx: 0,
  vy: 0,
  aimAngle: 0,
  grounded: false,
  crouched: false,
  burning: false,
  jetpackActive: false,
  jetpackCooldown: 0,
  fuel: JETPACK_FUEL_MAX,
  health: MAX_HEALTH,
  trailHealth: MAX_HEALTH,
  dead: false,
  respawnTimer: 0,
  spawnShield: 0,
  activeSlot: 0,
  activeWeaponId: WEAPON_IDS.M4,
  slots: [
    { id: WEAPON_IDS.M4, mag: 30, reserve: 150 },
    { id: WEAPON_IDS.MACHETE, mag: 0, reserve: 0 }
  ],
  grenades: 2,
  bombs: {
    [BOMB_IDS.FRAG]: 2,
    [BOMB_IDS.GAS]: 1,
    [BOMB_IDS.MINE]: 1
  },
  activeBombType: BOMB_IDS.FRAG,
  reloading: false,
  reloadPct: 0,
  kills: 0,
  deaths: 0,
  bestStreak: 0,
  ping: 1,
  walkPhase: 0,
  reconcileOffsetX: 0,
  reconcileOffsetY: 0,
  lastDamageLocalTime: 0,
  lastFireTimeMs: 0
};

let inputSeq = 0;
const predictionHistory = [];

let serverGrenades = [];
let serverDroppedWeapons = [];
let padStates = MAP_WEAPON_PADS.map(() => 1);

const camera = {
  x: 2000,
  y: 700,
  zoom: BASE_CAMERA_ZOOM,
  shakeIntensity: 0,
  shakeX: 0,
  shakeY: 0
};

// PC Keyboard & Mouse Input State
const keys = {
  left: false,
  right: false,
  jetpack: false,
  down: false,
  crouchHold: false,
  crouchToggle: false
};

const mouse = {
  screenX: window.innerWidth / 2,
  screenY: window.innerHeight / 2,
  worldX: 2000,
  worldY: 700,
  leftDown: false,
  leftPressedOnce: false,
  rightPressedOnce: false
};

// Mobile Twin-Stick Touch Input State
const touchState = {
  leftTouchId: null,
  leftOriginX: 0,
  leftOriginY: 0,
  leftMoveLeft: false,
  leftMoveRight: false,
  leftJetpackUp: false,
  leftDown: false,

  rightTouchId: null,
  rightOriginX: 0,
  rightOriginY: 0,
  aimActive: false,
  aimAngle: 0,
  stickShoot: false,

  jetBtnHeld: false,
  fireBtnHeld: false,
  crouchToggled: false
};

let pendingSwitchSlot = -1;
let pendingMelee = false;
let pendingInteract = false;
let pendingReload = false;
let pendingGrenade = false;

let currentPingMs = 1;
let fpsFrames = 0;
let fpsLastTime = performance.now();
let currentFps = 60;

// ==================== INITIALIZATION & UI SETUP ====================

function initStartScreen() {
  const defaultNames = ['Ghost_Actual', 'Sarge_PC', 'Viper_Six', 'Apex_Commando', 'Outpost_King'];
  playerNameInput.value = localStorage.getItem('mm_callsign') || defaultNames[Math.floor(Math.random() * defaultNames.length)];

  const savedColor = Number(localStorage.getItem('mm_color'));
  if (!Number.isNaN(savedColor) && savedColor >= 0 && savedColor < SOLDIER_COLORS.length) {
    selectedColorId = savedColor;
  }

  colorSwatchesEl.innerHTML = '';
  SOLDIER_COLORS.forEach((col) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (col.id === selectedColorId ? ' selected' : '');
    swatch.style.background = `linear-gradient(135deg, ${col.accent} 0%, ${col.body} 55%, ${col.vest} 100%)`;
    swatch.title = col.name;
    swatch.addEventListener('click', () => {
      selectedColorId = col.id;
      localStorage.setItem('mm_color', String(selectedColorId));
      previewColorName.textContent = col.name;
      document.querySelectorAll('.color-swatch').forEach((el, idx) => {
        el.classList.toggle('selected', idx === selectedColorId);
      });
    });
    colorSwatchesEl.appendChild(swatch);
  });

  previewColorName.textContent = SOLDIER_COLORS[selectedColorId].name;

  joinBtn.addEventListener('click', joinBattle);
  playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBattle();
  });

  sniperFovSlider.addEventListener('input', (e) => {
    setSniperFovMultiplier(parseFloat(e.target.value));
  });

  // Weapon Slot Tap to Switch (Mobile & PC)
  weaponSlot0El.addEventListener('click', () => {
    pendingSwitchSlot = 0;
  });
  weaponSlot1El.addEventListener('click', () => {
    pendingSwitchSlot = 1;
  });

  // Bomb Type Selector Pills (Frag / M7 Gas / Proxy Mine)
  if (cycleBombBtn) {
    cycleBombBtn.addEventListener('click', () => {
      pendingSwitchSlot = 10;
    });
  }
  if (bombPill1) {
    bombPill1.addEventListener('click', () => {
      pendingSwitchSlot = 10 + BOMB_IDS.FRAG;
    });
  }
  if (bombPill2) {
    bombPill2.addEventListener('click', () => {
      pendingSwitchSlot = 10 + BOMB_IDS.GAS;
    });
  }
  if (bombPill3) {
    bombPill3.addEventListener('click', () => {
      pendingSwitchSlot = 10 + BOMB_IDS.MINE;
    });
  }

  // Tapping the center pickup prompt banner also picks up the item on mobile!
  pickupPrompt.addEventListener('click', () => {
    pendingInteract = true;
  });

  // Pause / Resume & Admin Controls
  openPauseMenuBtn.addEventListener('click', () => {
    togglePauseModal();
  });

  resumeGameBtn.addEventListener('click', () => {
    setPauseModalOpen(false);
    engagePointerLock();
  });

  // Settings Modal Open/Close & Live Control Bindings (PC & Mobile)
  startOpenSettingsBtn.addEventListener('click', () => {
    setSettingsModalOpen(true);
  });
  openSettingsBtn.addEventListener('click', () => {
    setSettingsModalOpen(!isSettingsModalOpen);
  });
  pauseOpenSettingsBtn.addEventListener('click', () => {
    setPauseModalOpen(false);
    setSettingsModalOpen(true);
  });
  closeSettingsHeaderBtn.addEventListener('click', () => {
    setSettingsModalOpen(false);
    engagePointerLock();
  });
  saveCloseSettingsBtn.addEventListener('click', () => {
    saveUserSettings();
    setSettingsModalOpen(false);
    engagePointerLock();
  });

  resetSettingsBtn.addEventListener('click', () => {
    userSettings = { ...DEFAULT_USER_SETTINGS };
    syncSettingsControlsFromState();
    applyUserSettingsToEngine();
    saveUserSettings();
  });

  const bindLiveSetting = () => {
    userSettings.aimSensitivity = parseFloat(setAimSensitivity.value) || 1.0;
    userSettings.touchSensitivity = parseFloat(setTouchSensitivity.value) || 1.0;
    userSettings.touchScale = parseInt(setTouchScale.value, 10) || 100;
    userSettings.touchOpacity = parseInt(setTouchOpacity.value, 10) || 85;
    userSettings.mobileAutoFire = !!setMobileAutoFire.checked;
    userSettings.showCrosshair = !!setShowCrosshair.checked;
    userSettings.masterVolume = parseInt(setMasterVolume.value, 10);
    userSettings.sfxVolume = parseInt(setSfxVolume.value, 10);
    userSettings.jetpackVolume = parseInt(setJetpackVolume.value, 10);
    userSettings.muted = !!setMuteAudio.checked;
    userSettings.screenShake = parseInt(setScreenShake.value, 10);
    userSettings.particleQuality = parseFloat(setParticleQuality.value) || 1.0;
    userSettings.showDamageNums = !!setShowDamageNums.checked;
    userSettings.showRadar = !!setShowRadar.checked;

    syncSettingsControlsFromState();
    applyUserSettingsToEngine();
    saveUserSettings();
  };

  [
    setAimSensitivity,
    setTouchSensitivity,
    setTouchScale,
    setTouchOpacity,
    setMasterVolume,
    setSfxVolume,
    setJetpackVolume,
    setScreenShake
  ].forEach(el => el.addEventListener('input', bindLiveSetting));

  [
    setMobileAutoFire,
    setShowCrosshair,
    setMuteAudio,
    setParticleQuality,
    setShowDamageNums,
    setShowRadar
  ].forEach(el => el.addEventListener('change', bindLiveSetting));

  testAudioBtn.addEventListener('click', () => {
    soundFX.init();
    soundFX.playGunshot(WEAPON_IDS.M4, 0, 0, 0, 0);
  });

  // Tab Scoreboard Modal Open/Close (PC & Mobile)
  openTabScoreBtn.addEventListener('click', () => {
    setTabScoreboardOpen(!isTabScoreboardOpen);
  });
  closeTabScoreBtn.addEventListener('click', () => {
    setTabScoreboardOpen(false);
    engagePointerLock();
  });

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  adminApplyTimerBtn.addEventListener('click', () => {
    const sec = Number(adminDurationInput.value) || 300;
    socket.emit('adminSetTimer', sec, () => {
      setPauseModalOpen(false);
      engagePointerLock();
    });
  });

  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const sec = Number(chip.getAttribute('data-sec')) || 300;
      adminDurationInput.value = String(sec);
      socket.emit('adminSetTimer', sec);
    });
  });

  adminForceRestartBtn.addEventListener('click', () => {
    const sec = Number(adminDurationInput.value) || matchDurationSec;
    socket.emit('adminRestartMatch', sec, () => {
      setPauseModalOpen(false);
      engagePointerLock();
    });
  });

  adminEndRestartBtn.addEventListener('click', () => {
    const nextSec = Number(endNextDurationSelect.value) || matchDurationSec;
    socket.emit('adminRestartMatch', nextSec);
  });

  syncSettingsControlsFromState();
  applyUserSettingsToEngine();
  applyTouchModeUI();
  initMobileTouchListeners();
}

function setSniperFovMultiplier(val) {
  userSniperFovMult = Math.max(SNIPER_FOV_MIN_MULT, Math.min(SNIPER_FOV_MAX_MULT, val));
  sniperFovSlider.value = userSniperFovMult.toFixed(2);
  sniperFovValue.textContent = `${userSniperFovMult.toFixed(2)}x`;
}

function setSettingsModalOpen(open) {
  isSettingsModalOpen = open;
  settingsModal.classList.toggle('hidden', !open);
  if (open) {
    releasePointerLock();
    syncSettingsControlsFromState();
    keys.left = false;
    keys.right = false;
    keys.jetpack = false;
    keys.down = false;
    mouse.leftDown = false;
  }
}

function setTabScoreboardOpen(open) {
  isTabScoreboardOpen = open;
  tabScoreboardModal.classList.toggle('hidden', !open);
  if (open) {
    releasePointerLock();
    renderLiveTabScoreboard();
  }
}

function togglePauseModal() {
  if (!joinedGame || matchEnded) return;
  if (isSettingsModalOpen) {
    setSettingsModalOpen(false);
    engagePointerLock();
    return;
  }
  if (isTabScoreboardOpen) {
    setTabScoreboardOpen(false);
    engagePointerLock();
    return;
  }
  const nextOpen = !isPausedMenuOpen;
  setPauseModalOpen(nextOpen);
  if (!nextOpen) {
    engagePointerLock();
  }
}

function setPauseModalOpen(open) {
  isPausedMenuOpen = open;
  pauseModal.classList.toggle('hidden', !open);
  if (open) {
    releasePointerLock();
    keys.left = false;
    keys.right = false;
    keys.jetpack = false;
    keys.down = false;
    mouse.leftDown = false;
    adminDurationInput.value = String(matchDurationSec);
  }
}

function applyTouchModeUI() {
  const showTouch = touchMode === 'on';
  document.body.classList.toggle('touch-enabled', showTouch);
  mobileControlsEl.classList.toggle('hidden', !showTouch || !joinedGame);
  touchBtnLabel.textContent = showTouch ? 'Touch: ON' : 'Touch: OFF';
  if (showTouch) {
    releasePointerLock();
  }
}

function joinBattle() {
  soundFX.init();
  const callsign = (playerNameInput.value || 'Soldier').trim().slice(0, 16);
  localStorage.setItem('mm_callsign', callsign);
  const selectedDuration = Number(startMatchDurationSelect.value) || DEFAULT_MATCH_DURATION;

  socket.emit(
    'join',
    {
      name: callsign,
      colorId: selectedColorId,
      sessionId: mySessionId,
      matchDurationSec: selectedDuration
    },
    (ack) => {
      if (!ack) return;
      myPlayerId = ack.id;
      currentAdminId = ack.adminId;
      isLocalAdmin = !!ack.isAdmin;
      matchDurationSec = ack.matchDurationSec || selectedDuration;
      matchRemainingSec = ack.matchRemainingSec ?? matchDurationSec;
      matchEnded = !!ack.matchEnded;

      localPlayer.id = ack.id;
      localPlayer.x = ack.x;
      localPlayer.y = ack.y;
      localPlayer.vx = 0;
      localPlayer.vy = 0;
      localPlayer.reconcileOffsetX = 0;
      localPlayer.reconcileOffsetY = 0;
      camera.x = ack.x;
      camera.y = ack.y;
      camera.zoom = BASE_CAMERA_ZOOM;
      predictionHistory.length = 0;

      joinedGame = true;
      startScreen.classList.add('hidden');
      hudOverlay.classList.remove('hidden');
      updateAdminVisibility();
      applyTouchModeUI();
      updateWeaponSlotHUD(true);
      engagePointerLock();
    }
  );
}

function updateAdminVisibility() {
  isLocalAdmin = (myPlayerId !== null && myPlayerId === currentAdminId);
  adminRoleBadge.classList.toggle('hidden', !isLocalAdmin);
  pauseAdminBadge.classList.toggle('hidden', !isLocalAdmin);
  adminPauseSection.classList.toggle('hidden', !isLocalAdmin);
  adminEndControls.classList.toggle('hidden', !isLocalAdmin);
  nonAdminEndWait.classList.toggle('hidden', isLocalAdmin);
}

// ==================== MOBILE TWIN-STICK MULTI-TOUCH CONTROLLER ====================

function initMobileTouchListeners() {
  const maxStickRadius = 46;

  // 1. Left Virtual Thumbstick (Movement + Push Up for Jetpack)
  leftJoystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    soundFX.init();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (touchState.leftTouchId === null) {
        touchState.leftTouchId = t.identifier;
        const rect = leftJoystickBase.getBoundingClientRect();
        touchState.leftOriginX = rect.left + rect.width / 2;
        touchState.leftOriginY = rect.top + rect.height / 2;
        updateLeftStickFromPoint(t.clientX, t.clientY, maxStickRadius);
        break;
      }
    }
  }, { passive: false });

  leftJoystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchState.leftTouchId) {
        updateLeftStickFromPoint(t.clientX, t.clientY, maxStickRadius);
        break;
      }
    }
  }, { passive: false });

  const endLeftStick = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchState.leftTouchId) {
        touchState.leftTouchId = null;
        touchState.leftMoveLeft = false;
        touchState.leftMoveRight = false;
        touchState.leftJetpackUp = false;
        touchState.leftDown = false;
        leftJoystickKnob.style.transform = 'translate(0px, 0px)';
        break;
      }
    }
  };
  leftJoystickZone.addEventListener('touchend', endLeftStick, { passive: false });
  leftJoystickZone.addEventListener('touchcancel', endLeftStick, { passive: false });

  // 2. Right Virtual Thumbstick (360° Aim + Outer Ring Auto-Shoot)
  rightJoystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    soundFX.init();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (touchState.rightTouchId === null) {
        touchState.rightTouchId = t.identifier;
        const rect = rightJoystickBase.getBoundingClientRect();
        touchState.rightOriginX = rect.left + rect.width / 2;
        touchState.rightOriginY = rect.top + rect.height / 2;
        updateRightStickFromPoint(t.clientX, t.clientY, maxStickRadius);
        break;
      }
    }
  }, { passive: false });

  rightJoystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touchState.rightTouchId) {
        updateRightStickFromPoint(t.clientX, t.clientY, maxStickRadius);
        break;
      }
    }
  }, { passive: false });

  const endRightStick = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchState.rightTouchId) {
        touchState.rightTouchId = null;
        touchState.stickShoot = false;
        rightJoystickKnob.style.transform = 'translate(0px, 0px)';
        break;
      }
    }
  };
  rightJoystickZone.addEventListener('touchend', endRightStick, { passive: false });
  rightJoystickZone.addEventListener('touchcancel', endRightStick, { passive: false });

  // 3. Dedicated Jetpack Hold Button
  const bindHoldButton = (btnEl, onDown, onUp) => {
    btnEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      soundFX.init();
      btnEl.classList.add('pressed');
      onDown();
    }, { passive: false });
    const endFn = (e) => {
      e.preventDefault();
      btnEl.classList.remove('pressed');
      onUp();
    };
    btnEl.addEventListener('touchend', endFn, { passive: false });
    btnEl.addEventListener('touchcancel', endFn, { passive: false });
    btnEl.addEventListener('mousedown', () => { soundFX.init(); onDown(); });
    btnEl.addEventListener('mouseup', () => onUp());
  };

  bindHoldButton(
    mobileJetBtn,
    () => { touchState.jetBtnHeld = true; },
    () => { touchState.jetBtnHeld = false; }
  );

  bindHoldButton(
    mobileFireBtn,
    () => {
      touchState.fireBtnHeld = true;
      mouse.leftPressedOnce = true;
    },
    () => { touchState.fireBtnHeld = false; }
  );

  const bindTapButton = (btnEl, onTap) => {
    if (!btnEl) return;
    btnEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      soundFX.init();
      btnEl.classList.add('pressed');
      onTap();
    }, { passive: false });
    btnEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      btnEl.classList.remove('pressed');
    }, { passive: false });
    btnEl.addEventListener('click', () => {
      soundFX.init();
      onTap();
    });
  };

  bindTapButton(mobileCrouchBtn, () => {
    touchState.crouchToggled = !touchState.crouchToggled;
    keys.crouchToggle = touchState.crouchToggled;
    mobileCrouchBtn.classList.toggle('active', touchState.crouchToggled);
  });
  bindTapButton(mobileGrenadeBtn, () => { pendingGrenade = true; });
  bindTapButton(mobileBombSwitchBtn, () => { pendingSwitchSlot = 10; });
  bindTapButton(mobileMeleeBtn, () => { pendingMelee = true; });
  bindTapButton(mobileReloadBtn, () => { pendingReload = true; });
  bindTapButton(mobileSwapBtn, () => { pendingSwitchSlot = 2; });
  bindTapButton(mobilePickupBtn, () => { pendingInteract = true; });
}

function updateLeftStickFromPoint(clientX, clientY, maxR) {
  let dx = clientX - touchState.leftOriginX;
  let dy = clientY - touchState.leftOriginY;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  leftJoystickKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;

  const sens = Math.max(0.5, Math.min(2.0, userSettings.touchSensitivity || 1.0));
  const normX = (dx / maxR) * sens;
  const normY = (dy / maxR) * sens;

  touchState.leftMoveLeft = normX < -0.22;
  touchState.leftMoveRight = normX > 0.22;
  touchState.leftJetpackUp = normY < -0.30;
  touchState.leftDown = normY > 0.42;
}

function updateRightStickFromPoint(clientX, clientY, maxR) {
  let dx = clientX - touchState.rightOriginX;
  let dy = clientY - touchState.rightOriginY;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  rightJoystickKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;

  const sens = Math.max(0.5, Math.min(2.0, userSettings.touchSensitivity || 1.0));
  if (dist > (6 / sens)) {
    touchState.aimActive = true;
    touchState.aimAngle = Math.atan2(dy, dx);
    // Update virtual screen look-ahead target for dynamic camera
    const lookDist = 210 * (userSettings.aimSensitivity || 1.0);
    mouse.screenX = canvas.width / 2 + Math.cos(touchState.aimAngle) * lookDist;
    mouse.screenY = canvas.height / 2 + Math.sin(touchState.aimAngle) * lookDist;
  }

  // Pulling right stick past outer ring fires automatically if enabled in Settings
  const pullRatio = (dist / maxR) * Math.sqrt(sens);
  if (userSettings.mobileAutoFire && pullRatio > 0.62) {
    if (!touchState.stickShoot) {
      mouse.leftPressedOnce = true;
    }
    touchState.stickShoot = true;
  } else {
    touchState.stickShoot = false;
  }
}

// ==================== SOCKET.IO EVENT HANDLERS ====================

socket.on('roster', (rosterList) => {
  playerRoster.clear();
  let botCount = 0;
  for (const item of rosterList) {
    const [id, name, colorId, isBot, isAdmin] = item;
    playerRoster.set(id, { name, colorId, isBot: !!isBot, isAdmin: !!isAdmin });
    if (isAdmin) currentAdminId = id;
    if (isBot) botCount++;
  }
  botBtnLabel.textContent = botCount > 0 ? `Bot: ON (${botCount})` : 'Bot: OFF';
  updateAdminVisibility();
  updateLeaderboardHUD();
  if (isTabScoreboardOpen) renderLiveTabScoreboard();
});

socket.on('matchMeta', (meta) => {
  if (!meta) return;
  if (meta.adminId !== undefined) currentAdminId = meta.adminId;
  if (typeof meta.matchDurationSec === 'number') matchDurationSec = meta.matchDurationSec;
  if (typeof meta.matchRemainingSec === 'number') matchRemainingSec = meta.matchRemainingSec;
  if (typeof meta.matchEnded === 'boolean') matchEnded = meta.matchEnded;
  updateAdminVisibility();
});

socket.on('matchEnd', (data) => {
  matchEnded = true;
  matchRemainingSec = 0;
  releasePointerLock();
  soundFX.stopAllRocketLoops();
  if (data?.adminId !== undefined) currentAdminId = data.adminId;
  updateAdminVisibility();
  setPauseModalOpen(false);
  setSettingsModalOpen(false);
  setTabScoreboardOpen(false);
  renderEndOfMatchRankings(data?.winner, data?.rankings || []);
  matchEndModal.classList.remove('hidden');
});

socket.on('matchRestart', (data) => {
  matchEnded = false;
  activeGasClouds.length = 0;
  soundFX.stopAllRocketLoops();
  if (data?.matchDurationSec) matchDurationSec = data.matchDurationSec;
  if (data?.matchRemainingSec) matchRemainingSec = data.matchRemainingSec;
  if (data?.adminId !== undefined) currentAdminId = data.adminId;
  updateAdminVisibility();
  matchEndModal.classList.add('hidden');
  setPauseModalOpen(false);
  setTabScoreboardOpen(false);
  respawnBanner.classList.add('hidden');
  engagePointerLock();
});

function renderEndOfMatchRankings(winner, rankings) {
  if (winner) {
    winnerHeadline.textContent = `🏆 WINNER: ${winner.name.toUpperCase()}`;
    winnerSubline.textContent = `1st Place with ${winner.kills} Kills (${winner.kd} K/D Ratio)`;
  } else {
    winnerHeadline.textContent = 'MATCH COMPLETE';
    winnerSubline.textContent = 'Final Combat Standings';
  }

  finalRankingsBody.innerHTML = '';
  for (const row of rankings) {
    const tr = document.createElement('tr');
    if (row.rank === 1) tr.className = 'rank-1';
    const col = (SOLDIER_COLORS[row.colorId] || SOLDIER_COLORS[0]).accent;
    const meTag = row.id === myPlayerId ? ' (YOU)' : '';
    tr.innerHTML = `
      <td><span class="rank-badge">#${row.rank}</span></td>
      <td>
        <span class="lb-dot" style="display:inline-block;background:${col};margin-right:6px;"></span>
        <strong>${escapeHtml(row.name)}${meTag}</strong>
      </td>
      <td><strong>${row.kills}</strong></td>
      <td>${row.deaths}</td>
      <td>${row.kd}</td>
      <td>${row.bestStreak || 0}</td>
    `;
    finalRankingsBody.appendChild(tr);
  }
}

// High-Frequency 30Hz Compact Tuple Snapshot Handler
socket.on('s', (snapshot) => {
  const [
    _tick,
    _serverTimeMs,
    pTuples,
    _projTuples,
    grenTuples,
    padTuples,
    dropTuples,
    evts,
    remSec,
    endedBit
  ] = snapshot;

  if (typeof remSec === 'number') matchRemainingSec = remSec;
  if (endedBit !== undefined) matchEnded = endedBit === 1;

  const recvTime = performance.now();
  const seenPlayerIds = new Set();

  for (let i = 0; i < pTuples.length; i++) {
    const pt = pTuples[i];
    const id = pt[0];
    seenPlayerIds.add(id);

    const sx = pt[1];
    const sy = pt[2];
    const svx = pt[3];
    const svy = pt[4];
    const aimAngle = pt[5];
    const health = pt[6];
    const fuel = pt[7];
    const activeSlot = pt[8];
    const w0Id = pt[9];
    const w0Mag = pt[10];
    const w0Res = pt[11];
    const w1Id = pt[12];
    const w1Mag = pt[13];
    const w1Res = pt[14];
    const grenades = pt[15];
    const flags = pt[16];
    const lastAckSeq = pt[17];
    const kills = pt[18];
    const deaths = pt[19];
    const reloadPct = pt[20];
    const respawnTimer = pt[21];
    const spawnShield = pt[22];
    const pingMs = pt[23] !== undefined ? pt[23] : 1;
    const bestStreak = pt[24] || 0;
    const bombCode = pt[25] !== undefined ? pt[25] : (2 | (1 << 4) | (1 << 8) | (1 << 12));

    const isDead = (flags & 4) !== 0;
    const isReloading = (flags & 8) !== 0;
    const isCrouched = (flags & 64) !== 0;
    const isBurning = (flags & 128) !== 0;

    if (id === myPlayerId && joinedGame) {
      const prevW0 = localPlayer.slots[0].id;
      const prevW1 = localPlayer.slots[1].id;
      const prevActiveSlot = localPlayer.activeSlot;

      localPlayer.health = health;
      localPlayer.dead = isDead;
      localPlayer.burning = isBurning;
      localPlayer.respawnTimer = respawnTimer;
      localPlayer.spawnShield = spawnShield;
      localPlayer.activeSlot = activeSlot;
      localPlayer.slots[0].id = w0Id;
      localPlayer.slots[0].mag = w0Mag;
      localPlayer.slots[0].reserve = w0Res;
      localPlayer.slots[1].id = w1Id;
      localPlayer.slots[1].mag = w1Mag;
      localPlayer.slots[1].reserve = w1Res;
      localPlayer.activeWeaponId = localPlayer.slots[activeSlot].id;
      localPlayer.grenades = grenades;
      localPlayer.bombs[BOMB_IDS.FRAG] = bombCode & 0xF;
      localPlayer.bombs[BOMB_IDS.GAS] = (bombCode >> 4) & 0xF;
      localPlayer.bombs[BOMB_IDS.MINE] = (bombCode >> 8) & 0xF;
      localPlayer.activeBombType = ((bombCode >> 12) & 0x3) || BOMB_IDS.FRAG;
      localPlayer.reloading = isReloading;
      localPlayer.reloadPct = reloadPct;
      localPlayer.kills = kills;
      localPlayer.deaths = deaths;
      localPlayer.bestStreak = bestStreak;
      localPlayer.ping = currentPingMs || pingMs;

      if (prevW0 !== w0Id || prevW1 !== w1Id || prevActiveSlot !== activeSlot) {
        updateWeaponSlotHUD(true);
      }

      if (isDead) {
        localPlayer.x = sx;
        localPlayer.y = sy;
        localPlayer.vx = 0;
        localPlayer.vy = 0;
        localPlayer.crouched = false;
        localPlayer.reconcileOffsetX = 0;
        localPlayer.reconcileOffsetY = 0;
        predictionHistory.length = 0;
      } else {
        while (predictionHistory.length > 0 && predictionHistory[0].seq <= lastAckSeq) {
          predictionHistory.shift();
        }

        const oldVisualX = localPlayer.x + localPlayer.reconcileOffsetX;
        const oldVisualY = localPlayer.y + localPlayer.reconcileOffsetY;

        const simState = {
          x: sx,
          y: sy,
          vx: svx,
          vy: svy,
          fuel: fuel,
          grounded: (flags & 2) !== 0,
          crouched: isCrouched,
          jetpackActive: (flags & 1) !== 0,
          jetpackCooldown: localPlayer.jetpackCooldown,
          activeWeaponId: localPlayer.activeWeaponId,
          dead: false
        };

        for (let h = 0; h < predictionHistory.length; h++) {
          stepPlayerPhysics(simState, predictionHistory[h].input, TICK_DT, COMPILED_MAP);
        }

        const errDist = Math.hypot(simState.x - localPlayer.x, simState.y - localPlayer.y);
        if (errDist > 1.2) {
          localPlayer.x = simState.x;
          localPlayer.y = simState.y;
          localPlayer.vx = simState.vx;
          localPlayer.vy = simState.vy;
          localPlayer.fuel = simState.fuel;
          localPlayer.grounded = simState.grounded;
          localPlayer.crouched = simState.crouched;

          if (errDist < 180) {
            localPlayer.reconcileOffsetX = oldVisualX - localPlayer.x;
            localPlayer.reconcileOffsetY = oldVisualY - localPlayer.y;
          } else {
            localPlayer.reconcileOffsetX = 0;
            localPlayer.reconcileOffsetY = 0;
          }
        }
      }
    } else {
      let rp = remotePlayers.get(id);
      if (!rp) {
        rp = {
          id,
          snapshots: [],
          renderState: {
            x: sx,
            y: sy,
            vx: svx,
            vy: svy,
            aimAngle,
            health,
            fuel,
            activeWeaponId: activeSlot === 0 ? w0Id : w1Id,
            jetpackActive: (flags & 1) !== 0,
            grounded: (flags & 2) !== 0,
            crouched: isCrouched,
            burning: isBurning,
            dead: isDead,
            spawnShield,
            walkPhase: 0
          },
          kills,
          deaths,
          ping: pingMs,
          bestStreak,
          lastFireTimeMs: 0
        };
        remotePlayers.set(id, rp);
      }

      rp.kills = kills;
      rp.deaths = deaths;
      rp.ping = pingMs;
      rp.bestStreak = bestStreak;
      rp.snapshots.push({
        time: recvTime,
        x: sx,
        y: sy,
        vx: svx,
        vy: svy,
        aimAngle,
        health,
        fuel,
        activeWeaponId: activeSlot === 0 ? w0Id : w1Id,
        jetpackActive: (flags & 1) !== 0,
        grounded: (flags & 2) !== 0,
        crouched: isCrouched,
        burning: isBurning,
        dead: isDead,
        spawnShield
      });

      if (rp.snapshots.length > 20) {
        rp.snapshots.shift();
      }
    }
  }

  for (const id of remotePlayers.keys()) {
    if (!seenPlayerIds.has(id)) {
      remotePlayers.delete(id);
    }
  }

  serverGrenades = grenTuples.map(gt => ({
    id: gt[0],
    ownerId: gt[1],
    x: gt[2],
    y: gt[3],
    vx: gt[4],
    vy: gt[5],
    fuse: gt[6],
    bombType: gt[7] || BOMB_IDS.FRAG,
    stuck: gt[8] === 1,
    nx: gt[9] || 0,
    ny: gt[10] !== undefined ? gt[10] : -1,
    arming: gt[11] === 1
  }));

  padStates = padTuples;
  serverDroppedWeapons = dropTuples.map(dt => ({
    id: dt[0],
    weaponId: dt[1],
    x: dt[2],
    y: dt[3],
    mag: dt[4],
    reserve: dt[5]
  }));

  for (let i = 0; i < evts.length; i++) {
    handleServerEvent(evts[i]);
  }

  updateLeaderboardHUD();
  if (isTabScoreboardOpen) {
    renderLiveTabScoreboard();
  }
});

function handleServerEvent(ev) {
  const type = ev[0];
  const lx = joinedGame ? localPlayer.x : camera.x;
  const ly = joinedGame ? localPlayer.y : camera.y;
  const pQuality = userSettings.particleQuality || 1.0;

  if (type === EVT_FIRE) {
    const [, shooterId, weaponId, muzzleX, muzzleY, aimAngle, seed] = ev;
    const weapon = getWeapon(weaponId);

    if (shooterId === myPlayerId) {
      localPlayer.lastFireTimeMs = performance.now();
    } else {
      const rp = remotePlayers.get(shooterId);
      if (rp) rp.lastFireTimeMs = performance.now();
    }

    soundFX.playGunshot(weaponId, muzzleX, muzzleY, lx, ly);

    activeMuzzleFlashes.push({
      x: muzzleX,
      y: muzzleY,
      angle: aimAngle,
      size: weaponId === WEAPON_IDS.M249 ? 20 : (weaponId === WEAPON_IDS.SNIPER ? 26 : (weaponId === WEAPON_IDS.FLAMETHROWER ? 22 : 15)),
      color: weapon.tracerColor || '#ffeaa7',
      life: 0,
      maxLife: 0.055
    });

    if (!weapon.isMelee && weaponId !== WEAPON_IDS.RPG && !weapon.isFlame && Math.random() <= pQuality) {
      const ejectAngle = aimAngle + (Math.cos(aimAngle) >= 0 ? -Math.PI * 0.65 : Math.PI * 0.65);
      const ejectSpeed = 95 + Math.random() * 75;
      const casingColor = weaponId === WEAPON_IDS.SHOTGUN ? '#e74c3c' : '#f1c40f';
      const casingLen = weaponId === WEAPON_IDS.SNIPER ? 8 : 5.5;
      casingPool.acquire(
        muzzleX - Math.cos(aimAngle) * 18,
        muzzleY - Math.sin(aimAngle) * 18,
        Math.cos(ejectAngle) * ejectSpeed + (Math.random() - 0.5) * 40,
        Math.sin(ejectAngle) * ejectSpeed - 70,
        casingColor,
        casingLen
      );
    }

    const pellets = weapon.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const randVal = Math.sin(seed + p * 19.37) * 10000;
      const frac = randVal - Math.floor(randVal) - 0.5;
      const pelletAngle = aimAngle + frac * 2 * weapon.spread;
      const speedVar = pellets > 1 ? (0.92 + ((p % 3) * 0.04)) : 1.0;
      const speed = weapon.bulletSpeed * speedVar;
      tracerPool.acquire(
        muzzleX,
        muzzleY,
        Math.cos(pelletAngle) * speed,
        Math.sin(pelletAngle) * speed,
        weaponId,
        weapon.bulletLife
      );
    }

    if (shooterId === myPlayerId) {
      addScreenShake(weapon.shakeAmount);
    } else {
      const dist = Math.hypot(muzzleX - lx, muzzleY - ly);
      if (dist < 500) {
        addScreenShake(weapon.shakeAmount * 0.25 * (1 - dist / 500));
      }
    }
  } else if (type === EVT_HIT) {
    const [, targetId, attackerId, hitX, hitY, dmg, isHeadshot] = ev;

    const isMineDestroyed = targetId === 0;
    const sparkCount = Math.max(2, Math.round(9 * pQuality));
    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 140;
      particlePool.acquire(
        hitX,
        hitY,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 30,
        3.5 + Math.random() * 3,
        0.5,
        isMineDestroyed ? (i % 2 === 0 ? '#ffd32a' : '#39ff14') : (i < 6 ? '#eb2f06' : '#ff793f'),
        0.25 + Math.random() * 0.2,
        420,
        isMineDestroyed
      );
    }

    if (userSettings.showDamageNums) {
      if (isMineDestroyed) {
        floatingTextPool.acquire(hitX, hitY - 16, 'MINE DESTROYED!', '#ffd32a', 13);
      } else {
        const txtColor = isHeadshot ? '#feca57' : (targetId === myPlayerId ? '#ff4757' : '#ffffff');
        const txtLabel = isHeadshot ? `-${dmg} CRIT!` : `-${dmg}`;
        floatingTextPool.acquire(hitX, hitY - 16, txtLabel, txtColor, isHeadshot ? 17 : 14);
      }
    }

    if (attackerId === myPlayerId && targetId !== myPlayerId) {
      soundFX.playHitmarker(!!isHeadshot);
    }

    if (targetId === myPlayerId) {
      localPlayer.lastDamageLocalTime = performance.now();
      addScreenShake(5.5);

      let sourceX = hitX;
      let sourceY = hitY;
      if (attackerId && attackerId !== myPlayerId) {
        const attacker = remotePlayers.get(attackerId);
        if (attacker) {
          sourceX = attacker.renderState.x;
          sourceY = attacker.renderState.y;
        }
      }
      const dirAngle = Math.atan2(sourceY - localPlayer.y, sourceX - localPlayer.x);
      directionalHitIndicators.push({
        angle: dirAngle,
        alpha: 1.0
      });
    }
  } else if (type === EVT_EXPLOSION) {
    const [, ex, ey, radius] = ev;
    soundFX.playExplosion(ex, ey, lx, ly);

    // Pre-generate cartoon cloud puffs for rich comic-book blast animation
    const puffs = [];
    const puffCount = 10;
    for (let i = 0; i < puffCount; i++) {
      const a = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      puffs.push({
        angle: a,
        distFrac: 0.35 + Math.random() * 0.45,
        sizeFrac: 0.24 + Math.random() * 0.16,
        isSmoke: i % 2 === 0
      });
    }

    activeExplosions.push({
      x: ex,
      y: ey,
      maxRadius: radius,
      life: 0,
      maxLife: 0.48,
      seedAngle: Math.random() * Math.PI * 2,
      puffs
    });

    const expParticles = Math.max(12, Math.round(46 * pQuality));
    for (let i = 0; i < expParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 380;
      const isFire = i < expParticles * 0.62;
      const color = isFire
        ? (Math.random() < 0.35 ? '#fff200' : (Math.random() < 0.65 ? '#ff9f43' : '#ee5253'))
        : (Math.random() < 0.5 ? '#576574' : '#222f3e');
      particlePool.acquire(
        ex + (Math.random() - 0.5) * 18,
        ey + (Math.random() - 0.5) * 18,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 48,
        isFire ? (9 + Math.random() * 13) : (12 + Math.random() * 15),
        1.5,
        color,
        0.38 + Math.random() * 0.45,
        isFire ? 150 : -45,
        isFire,
        true // Comic dark ink outline on explosion puffs!
      );
    }

    const dist = Math.hypot(ex - lx, ey - ly);
    if (dist < 900) {
      addScreenShake(20 * (1 - dist / 900));
    }
  } else if (type === EVT_GAS_CLOUD) {
    const [, gx, gy, radius, duration] = ev;
    soundFX.playGasCloudRelease(gx, gy, lx, ly);

    const puffs = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = (0.15 + Math.random() * 0.65) * radius;
      puffs.push({
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r * 0.78,
        r: 28 + Math.random() * 26,
        phase: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 1.4,
        shade: i % 3 === 0 ? '#b8e936' : (i % 2 === 0 ? '#7bed9f' : '#6ab04c')
      });
    }

    activeGasClouds.push({
      x: gx,
      y: gy,
      radius: radius || 145,
      life: 0,
      maxLife: duration || 8.5,
      puffs
    });
  } else if (type === EVT_MINE_TRIGGER) {
    const [, mx, my] = ev;
    soundFX.playMineTrigger(mx, my, lx, ly);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      particlePool.acquire(
        mx,
        my,
        Math.cos(a) * 140,
        Math.sin(a) * 140,
        5,
        1,
        i % 2 === 0 ? '#2ed573' : '#ff4757',
        0.22,
        0,
        true,
        true
      );
    }
  } else if (type === EVT_KILL) {
    const [, killerId, victimId, weaponId, vx, vy, colorId, killerNameFromServer] = ev;
    spawnRagdollExplosion(vx, vy, colorId);
    addKillFeedEntry(killerId, victimId, weaponId, killerNameFromServer);

    // Iconic Mini Militia Death Cry ("Aaaagh!" + ragdoll thud)
    soundFX.playDeathCry(vx, vy, lx, ly, victimId);

    if (killerId === myPlayerId && victimId !== myPlayerId) {
      soundFX.playKillChime();
      if (userSettings.showDamageNums) {
        floatingTextPool.acquire(vx, vy - 30, 'ELIMINATED!', '#2ed573', 18);
      }
    }

    if (victimId === myPlayerId) {
      if (weaponId === -1) {
        // Killed automatically by falling into the Abyss!
        respawnKillerName.textContent = 'THE ABYSS';
        respawnWeaponUsed.textContent = 'Fell out of the map';
        soundFX.playExplosion(vx, vy, lx, ly);
        addScreenShake(12);
      } else {
        const killerMeta = playerRoster.get(killerId);
        const killerDisplayName = killerNameFromServer || killerMeta?.name || 'Enemy Soldier';
        let wName = 'Frag Grenade';
        if (weaponId === RESOURCE_IDS.GAS_CRATE) wName = 'M7 Toxic Gas Bomb';
        else if (weaponId === RESOURCE_IDS.MINE_CRATE) wName = 'Proxy Mine';
        else if (weaponId > 0) wName = getWeapon(weaponId).name;
        respawnKillerName.textContent = killerId === myPlayerId
          ? `${killerDisplayName} (SELF)`
          : killerDisplayName;
        respawnWeaponUsed.textContent = killerId === myPlayerId
          ? `killed by own ${wName}`
          : `using ${wName}`;
      }
    }
  } else if (type === EVT_MELEE) {
    const [, _attackerId, mx, my, aimAngle] = ev;
    soundFX.playMelee(mx, my, lx, ly);
    activeMeleeSlashes.push({
      x: mx,
      y: my,
      angle: aimAngle,
      life: 0,
      maxLife: 0.16
    });
  } else if (type === EVT_PICKUP) {
    const [, pid, itemId, px, py] = ev;
    const info = getPickupInfo(itemId);
    if (userSettings.showDamageNums) {
      floatingTextPool.acquire(px, py - 18, `+ ${info.shortName}`, '#7ad162', 14);
    }
    if (pid === myPlayerId) {
      soundFX.playPickup();
      updateWeaponSlotHUD(true);
    }
  } else if (type === EVT_GRENADE_THROW) {
    const [, _pid, gx, gy] = ev;
    soundFX.playGrenadeThrow(gx, gy, lx, ly);
  } else if (type === EVT_RELOAD) {
    const [, pid] = ev;
    if (pid === myPlayerId) {
      soundFX.playReload();
    }
  }
}

// ==================== RAGDOLL & KILL FEED ====================

function spawnRagdollExplosion(x, y, colorId) {
  const palette = SOLDIER_COLORS[colorId] || SOLDIER_COLORS[0];
  const parts = [
    { type: 'head', color: palette.helmet, r: 9 },
    { type: 'torso', color: palette.vest, r: 10 },
    { type: 'limb', color: palette.body, r: 6 },
    { type: 'limb', color: palette.body, r: 6 },
    { type: 'boot', color: '#2f3640', r: 5 },
    { type: 'boot', color: '#2f3640', r: 5 }
  ];

  for (const part of parts) {
    const a = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
    const spd = 140 + Math.random() * 220;
    activeRagdolls.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * spd + (Math.random() - 0.5) * 120,
      vy: Math.sin(a) * spd - 80,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 16,
      type: part.type,
      color: part.color,
      r: part.r,
      life: 0,
      maxLife: 2.8
    });
  }
}

function addKillFeedEntry(killerId, victimId, weaponId, killerNameOverride) {
  const victim = playerRoster.get(victimId)?.name || 'Soldier';
  const item = document.createElement('div');
  item.className = 'kill-item';

  if (weaponId === -1) {
    // Abyss Fall-Out Kill Feed Entry
    item.innerHTML = `
      <span style="color:${victimId === myPlayerId ? '#ff6b81' : '#dfe4ea'}">${escapeHtml(victim)}</span>
      <span class="kill-weapon-tag">FELL OUT</span>
      <span style="color:#ff4757">THE ABYSS</span>
    `;
  } else {
    const killer = killerNameOverride || playerRoster.get(killerId)?.name || 'Hazard';
    let wLabel = 'FRAG';
    if (weaponId === RESOURCE_IDS.GAS_CRATE) wLabel = 'M7 GAS';
    else if (weaponId === RESOURCE_IDS.MINE_CRATE) wLabel = 'PROXY MINE';
    else if (weaponId > 0) wLabel = getWeapon(weaponId).shortName;
    item.innerHTML = `
      <span style="color:${killerId === myPlayerId ? '#7ad162' : '#f1f2f6'}">${escapeHtml(killer)}</span>
      <span class="kill-weapon-tag">${escapeHtml(wLabel)}</span>
      <span style="color:${victimId === myPlayerId ? '#ff6b81' : '#dfe4ea'}">${escapeHtml(victim)}</span>
    `;
  }
  killFeedEl.prepend(item);

  while (killFeedEl.children.length > 5) {
    killFeedEl.lastChild.remove();
  }

  setTimeout(() => {
    if (item.parentNode) item.remove();
  }, 5500);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

// ==================== INPUT LISTENERS (PC MOUSE + KEYBOARD) ====================

window.addEventListener('keydown', (e) => {
  if (!joinedGame) return;
  if (document.activeElement === playerNameInput || document.activeElement === adminDurationInput) return;

  const code = e.code;

  // TAB Button: View Live Scoreboard (Ping ms, Kills, Deaths, K/D Ratio)
  if (code === 'Tab') {
    e.preventDefault();
    if (!e.repeat) {
      if (isTabScoreboardOpen) {
        setTabScoreboardOpen(false);
        tabKeyDownTime = 0;
        engagePointerLock();
      } else {
        setTabScoreboardOpen(true);
        tabKeyDownTime = performance.now();
      }
    }
    return;
  }

  if (code === 'Escape' && !e.repeat) {
    togglePauseModal();
    return;
  }

  if (isPausedMenuOpen || isSettingsModalOpen || matchEnded) return;

  if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
  else if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
  else if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') {
    keys.jetpack = true;
    keys.crouchToggle = false;
    touchState.crouchToggled = false;
    if (mobileCrouchBtn) mobileCrouchBtn.classList.remove('active');
    e.preventDefault();
  } else if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
  else if (code === 'KeyC' && !e.repeat) {
    keys.crouchToggle = !keys.crouchToggle;
    touchState.crouchToggled = keys.crouchToggle;
    if (mobileCrouchBtn) mobileCrouchBtn.classList.toggle('active', keys.crouchToggle);
  } else if (code === 'ControlLeft' || code === 'ControlRight') {
    keys.crouchHold = true;
  } else if ((code === 'KeyX' || code === 'Digit3') && !e.repeat) {
    pendingSwitchSlot = 10; // Cycle Bomb Type (Frag -> M7 Gas -> Proxy Mine)
  } else if (code === 'KeyQ' && !e.repeat) pendingSwitchSlot = 2;
  else if (code === 'Digit1' && !e.repeat) pendingSwitchSlot = 0;
  else if (code === 'Digit2' && !e.repeat) pendingSwitchSlot = 1;
  else if (code === 'KeyE' && !e.repeat) pendingInteract = true;
  else if (code === 'KeyV' && !e.repeat) pendingMelee = true;
  else if (code === 'KeyR' && !e.repeat) pendingReload = true;
  else if (code === 'KeyG' && !e.repeat) pendingGrenade = true;
  else if (code === 'KeyB' && !e.repeat) socket.emit('toggleBot', 'toggle');
  else if (code === 'KeyM' && !e.repeat) toggleAudioMute();
  else if ((code === 'BracketLeft' || code === 'Minus') && localPlayer.activeWeaponId === WEAPON_IDS.SNIPER) {
    setSniperFovMultiplier(userSniperFovMult - 0.08);
  } else if ((code === 'BracketRight' || code === 'Equal') && localPlayer.activeWeaponId === WEAPON_IDS.SNIPER) {
    setSniperFovMultiplier(userSniperFovMult + 0.08);
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'Tab') {
    e.preventDefault();
    // If user held TAB (> 220ms), releasing TAB closes the scoreboard automatically
    if (isTabScoreboardOpen && tabKeyDownTime > 0 && (performance.now() - tabKeyDownTime) > 220) {
      setTabScoreboardOpen(false);
      tabKeyDownTime = 0;
      engagePointerLock();
    }
    return;
  }
  if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
  else if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
  else if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') keys.jetpack = false;
  else if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
  else if (code === 'ControlLeft' || code === 'ControlRight') keys.crouchHold = false;
});

window.addEventListener('mousemove', (e) => {
  if (touchState.rightTouchId !== null) return;
  touchState.aimActive = false;

  if (isPointerLocked()) {
    const sens = Math.max(0.25, Math.min(2.5, userSettings.aimSensitivity || 1.0));
    mouse.screenX = Math.max(10, Math.min(canvas.width - 10, mouse.screenX + (e.movementX || 0) * sens));
    mouse.screenY = Math.max(10, Math.min(canvas.height - 10, mouse.screenY + (e.movementY || 0) * sens));
  } else {
    mouse.screenX = Math.max(0, Math.min(canvas.width, e.clientX));
    mouse.screenY = Math.max(0, Math.min(canvas.height, e.clientY));
  }
});

window.addEventListener('mousedown', (e) => {
  if (!joinedGame || isPausedMenuOpen || isSettingsModalOpen || matchEnded) return;
  if (
    e.target.closest('.hud-bottom-right') ||
    e.target.closest('.hud-top-center') ||
    e.target.closest('.loadout-card') ||
    e.target.closest('.mobile-controls') ||
    e.target.closest('.pickup-prompt') ||
    e.target.closest('.modal-card')
  ) {
    return;
  }
  soundFX.init();
  // Lock mouse inside game window on PC so it never escapes to other monitors or tabs
  engagePointerLock();

  if (e.button === 0) {
    mouse.leftDown = true;
    mouse.leftPressedOnce = true;
  } else if (e.button === 2) {
    mouse.rightPressedOnce = true;
    pendingGrenade = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.leftDown = false;
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('wheel', (e) => {
  if (!joinedGame || isPausedMenuOpen || isSettingsModalOpen || matchEnded) return;
  if (localPlayer.activeWeaponId === WEAPON_IDS.SNIPER) {
    const dir = e.deltaY > 0 ? 1 : -1;
    setSniperFovMultiplier(userSniperFovMult + dir * 0.08);
  } else if (Math.abs(e.deltaY) > 4) {
    pendingSwitchSlot = 2;
  }
});

toggleTouchBtn.addEventListener('click', () => {
  touchMode = touchMode === 'on' ? 'off' : 'on';
  applyTouchModeUI();
  toggleTouchBtn.blur();
});

toggleBotBtn.addEventListener('click', () => {
  socket.emit('toggleBot', 'toggle');
  toggleBotBtn.blur();
});

toggleMuteBtn.addEventListener('click', () => {
  toggleAudioMute();
  toggleMuteBtn.blur();
});

function toggleAudioMute() {
  userSettings.muted = !userSettings.muted;
  setMuteAudio.checked = userSettings.muted;
  applyUserSettingsToEngine();
  saveUserSettings();
}

// ==================== PING TELEMETRY LOOP ====================
setInterval(() => {
  const t0 = performance.now();
  socket.volatile.emit('p', t0, currentPingMs, () => {
    currentPingMs = Math.max(1, Math.round(performance.now() - t0));
    localPlayer.ping = currentPingMs;
    pingCounterEl.textContent = String(currentPingMs);
    pingDotEl.className = 'ping-dot ' + (currentPingMs < 45 ? 'good' : (currentPingMs < 100 ? 'warn' : 'bad'));
  });
}, 1200);

// ==================== 60HZ CLIENT PREDICTION & INPUT DISPATCH ====================

let clientSimAccum = 0;
let lastFrameTimestamp = performance.now();

function stepClientPrediction(dt) {
  if (!joinedGame || !myPlayerId || matchEnded) return;

  const renderX = localPlayer.x + localPlayer.reconcileOffsetX;
  const renderY = localPlayer.y + localPlayer.reconcileOffsetY;
  const aimOriginY = localPlayer.crouched ? (renderY + 3) : (renderY - 3);

  if (touchState.aimActive || touchState.rightTouchId !== null) {
    localPlayer.aimAngle = Math.round(touchState.aimAngle * 100) / 100;
  } else {
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    mouse.worldX = camera.x + (mouse.screenX - halfW) / camera.zoom;
    mouse.worldY = camera.y + (mouse.screenY - halfH) / camera.zoom;
    const aimAngle = Math.atan2(mouse.worldY - aimOriginY, mouse.worldX - renderX);
    localPlayer.aimAngle = Math.round(aimAngle * 100) / 100;
  }

  inputSeq++;

  const moveLeft = !isPausedMenuOpen && (keys.left || touchState.leftMoveLeft);
  const moveRight = !isPausedMenuOpen && (keys.right || touchState.leftMoveRight);
  const wantJetpack = !isPausedMenuOpen && (keys.jetpack || touchState.leftJetpackUp || touchState.jetBtnHeld);
  const wantDown = !isPausedMenuOpen && (keys.down || touchState.leftDown);
  const wantCrouch = !isPausedMenuOpen && !wantJetpack && (
    keys.crouchToggle ||
    keys.crouchHold ||
    touchState.crouchToggled ||
    (wantDown && localPlayer.grounded)
  );
  const wantShoot = !isPausedMenuOpen && (mouse.leftDown || touchState.stickShoot || touchState.fireBtnHeld);

  let mask = 0;
  if (moveLeft) mask |= 1;
  if (moveRight) mask |= 2;
  if (wantJetpack) mask |= 4;
  if (wantDown) mask |= 8;
  if (wantShoot) mask |= 16;
  if (!isPausedMenuOpen && mouse.leftPressedOnce) mask |= 32;
  if (!isPausedMenuOpen && (pendingGrenade || mouse.rightPressedOnce)) mask |= 64;
  if (!isPausedMenuOpen && pendingMelee) mask |= 128;
  if (!isPausedMenuOpen && pendingInteract) mask |= 256;
  if (!isPausedMenuOpen && pendingReload) mask |= 512;
  if (wantCrouch) mask |= 1024;

  const switchSlotCmd = isPausedMenuOpen ? -1 : pendingSwitchSlot;

  mouse.leftPressedOnce = false;
  mouse.rightPressedOnce = false;
  pendingGrenade = false;
  pendingMelee = false;
  pendingInteract = false;
  pendingReload = false;
  pendingSwitchSlot = -1;

  const inputObj = {
    left: (mask & 1) !== 0,
    right: (mask & 2) !== 0,
    jetpack: (mask & 4) !== 0,
    down: (mask & 8) !== 0,
    crouch: (mask & 1024) !== 0,
    aimAngle: localPlayer.aimAngle
  };

  socket.emit('i', [inputSeq, mask, localPlayer.aimAngle, switchSlotCmd]);

  if (!localPlayer.dead) {
    stepPlayerPhysics(localPlayer, inputObj, dt, COMPILED_MAP);

    predictionHistory.push({
      seq: inputSeq,
      input: inputObj
    });
    if (predictionHistory.length > 90) {
      predictionHistory.shift();
    }
  }
}

// ==================== VISUAL EFFECTS & ENTITY INTERPOLATION ====================

function updateVisuals(dt, nowMs) {
  const decay = Math.exp(-16 * dt);
  localPlayer.reconcileOffsetX *= decay;
  localPlayer.reconcileOffsetY *= decay;
  if (Math.abs(localPlayer.reconcileOffsetX) < 0.05) localPlayer.reconcileOffsetX = 0;
  if (Math.abs(localPlayer.reconcileOffsetY) < 0.05) localPlayer.reconcileOffsetY = 0;

  const lx = joinedGame ? (localPlayer.x + localPlayer.reconcileOffsetX) : camera.x;
  const ly = joinedGame ? (localPlayer.y + localPlayer.reconcileOffsetY) : camera.y;

  if (joinedGame && !localPlayer.dead && !matchEnded) {
    if (localPlayer.grounded && Math.abs(localPlayer.vx) > 15) {
      localPlayer.walkPhase += localPlayer.vx * dt * 0.055;
    } else {
      localPlayer.walkPhase *= 0.85;
    }

    soundFX.setJetpackThrust(localPlayer.jetpackActive);
    if (localPlayer.jetpackActive) {
      emitJetpackParticles(lx, ly, localPlayer.vx, localPlayer.vy, localPlayer.aimAngle);
    }
    if (localPlayer.burning && Math.random() < 0.55) {
      particlePool.acquire(
        lx + (Math.random() - 0.5) * 18,
        ly + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 35,
        -45 - Math.random() * 55,
        5 + Math.random() * 4,
        0.8,
        Math.random() < 0.5 ? '#ff9f43' : '#ff4757',
        0.26,
        -60,
        true
      );
    }
  } else {
    soundFX.setJetpackThrust(false);
  }

  // Interpolate Remote Players
  const renderTimestamp = nowMs - INTERP_BUFFER_MS;
  for (const rp of remotePlayers.values()) {
    const snaps = rp.snapshots;
    if (snaps.length === 0) continue;

    if (snaps.length === 1 || renderTimestamp <= snaps[0].time) {
      Object.assign(rp.renderState, snaps[0]);
    } else if (renderTimestamp >= snaps[snaps.length - 1].time) {
      const latest = snaps[snaps.length - 1];
      const extraDt = matchEnded ? 0 : Math.min(0.06, (renderTimestamp - latest.time) / 1000);
      rp.renderState.x = latest.x + latest.vx * extraDt;
      rp.renderState.y = latest.y + latest.vy * extraDt;
      rp.renderState.vx = latest.vx;
      rp.renderState.vy = latest.vy;
      rp.renderState.aimAngle = latest.aimAngle;
      rp.renderState.health = latest.health;
      rp.renderState.fuel = latest.fuel;
      rp.renderState.activeWeaponId = latest.activeWeaponId;
      rp.renderState.jetpackActive = latest.jetpackActive;
      rp.renderState.grounded = latest.grounded;
      rp.renderState.crouched = !!latest.crouched;
      rp.renderState.burning = !!latest.burning;
      rp.renderState.dead = latest.dead;
      rp.renderState.spawnShield = latest.spawnShield;
    } else {
      let s0 = snaps[0];
      let s1 = snaps[1];
      for (let i = 0; i < snaps.length - 1; i++) {
        if (snaps[i].time <= renderTimestamp && renderTimestamp <= snaps[i + 1].time) {
          s0 = snaps[i];
          s1 = snaps[i + 1];
          break;
        }
      }
      const span = s1.time - s0.time;
      const t = span > 0.001 ? Math.max(0, Math.min(1, (renderTimestamp - s0.time) / span)) : 1;

      rp.renderState.x = s0.x + (s1.x - s0.x) * t;
      rp.renderState.y = s0.y + (s1.y - s0.y) * t;
      rp.renderState.vx = s0.vx + (s1.vx - s0.vx) * t;
      rp.renderState.vy = s0.vy + (s1.vy - s0.vy) * t;
      rp.renderState.aimAngle = lerpAngle(s0.aimAngle, s1.aimAngle, t);
      rp.renderState.health = s1.health;
      rp.renderState.fuel = s1.fuel;
      rp.renderState.activeWeaponId = s1.activeWeaponId;
      rp.renderState.jetpackActive = s1.jetpackActive;
      rp.renderState.grounded = s1.grounded;
      rp.renderState.crouched = !!s1.crouched;
      rp.renderState.burning = !!s1.burning;
      rp.renderState.dead = s1.dead;
      rp.renderState.spawnShield = s1.spawnShield;
    }

    if (!rp.renderState.dead && !matchEnded) {
      if (rp.renderState.grounded && Math.abs(rp.renderState.vx) > 15) {
        rp.renderState.walkPhase = (rp.renderState.walkPhase || 0) + rp.renderState.vx * dt * 0.055;
      }
      if (rp.renderState.jetpackActive) {
        emitJetpackParticles(
          rp.renderState.x,
          rp.renderState.y,
          rp.renderState.vx,
          rp.renderState.vy,
          rp.renderState.aimAngle
        );
      }
      if (rp.renderState.burning && Math.random() < 0.55) {
        particlePool.acquire(
          rp.renderState.x + (Math.random() - 0.5) * 18,
          rp.renderState.y + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 35,
          -45 - Math.random() * 55,
          5 + Math.random() * 4,
          0.8,
          Math.random() < 0.5 ? '#ff9f43' : '#ff4757',
          0.26,
          -60,
          true
        );
      }
    }
  }

  // Step Pooled Visual Tracers / Rockets / Flamethrower Fire Stream
  const tracers = tracerPool.activeList;
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life += dt;
    if (tr.life >= tr.maxLife) {
      if (tr.isRocket && tr.loopId) {
        soundFX.stopRocketLoop(tr.loopId);
      }
      tracerPool.releaseAt(i);
      continue;
    }

    if (tr.isRocket) {
      tr.vy += 90 * dt;
      if (tr.loopId) {
        soundFX.updateRocketLoop(tr.loopId, tr.x, tr.y, lx, ly);
      }
      particlePool.acquire(
        tr.x - tr.vx * 0.01,
        tr.y - tr.vy * 0.01,
        (Math.random() - 0.5) * 38,
        (Math.random() - 0.5) * 38,
        6 + Math.random() * 4,
        13,
        Math.random() < 0.45 ? '#ff9f43' : 'rgba(200, 210, 220, 0.72)',
        0.28,
        -25,
        false,
        true
      );
    } else if (tr.isFlame) {
      // Flamethrower fire stream rises slightly and decelerates with turbulent billows
      tr.vy -= 55 * dt;
      tr.vx *= (1 - 1.5 * dt);
      if (Math.random() < 0.35) {
        particlePool.acquire(
          tr.x + (Math.random() - 0.5) * 10,
          tr.y + (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 45,
          -35 - Math.random() * 45,
          4 + Math.random() * 4,
          0.8,
          Math.random() < 0.5 ? '#fff200' : '#ff6b6b',
          0.18,
          -50,
          true
        );
      }
    }

    tr.prevX = tr.x;
    tr.prevY = tr.y;
    const nextX = tr.x + tr.vx * dt;
    const nextY = tr.y + tr.vy * dt;

    const hit = raycastMap(tr.x, tr.y, nextX, nextY, COMPILED_MAP);
    if (hit.hit) {
      if (tr.isRocket && tr.loopId) {
        soundFX.stopRocketLoop(tr.loopId);
      }
      const sparkCnt = tr.isFlame ? 3 : 5;
      for (let s = 0; s < sparkCnt; s++) {
        const ra = Math.atan2(hit.ny, hit.nx) + (Math.random() - 0.5) * 1.4;
        const rspd = 40 + Math.random() * 110;
        particlePool.acquire(
          hit.x,
          hit.y,
          Math.cos(ra) * rspd,
          Math.sin(ra) * rspd,
          tr.isFlame ? (5 + Math.random() * 4) : (2.5 + Math.random() * 2),
          0.5,
          tr.isFlame ? '#ff7f00' : (hit.material === 'metal' ? '#ffd32a' : '#d2c8b8'),
          0.18 + Math.random() * 0.14,
          tr.isFlame ? -60 : 300,
          tr.isFlame || hit.material === 'metal'
        );
      }
      tracerPool.releaseAt(i);
      continue;
    }

    tr.x = nextX;
    tr.y = nextY;
  }

  // Step Active Toxic Gas Clouds
  for (let i = activeGasClouds.length - 1; i >= 0; i--) {
    const gc = activeGasClouds[i];
    gc.life += dt;
    if (gc.life >= gc.maxLife) {
      activeGasClouds.splice(i, 1);
      continue;
    }
    if (Math.random() < 0.45 * (userSettings.particleQuality || 1.0)) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * gc.radius * 0.85;
      particlePool.acquire(
        gc.x + Math.cos(a) * r,
        gc.y + Math.sin(a) * r * 0.8,
        (Math.random() - 0.5) * 24,
        -25 - Math.random() * 30,
        6 + Math.random() * 7,
        1.5,
        Math.random() < 0.5 ? '#b8e936' : '#2ed573',
        0.45 + Math.random() * 0.35,
        -25,
        false
      );
    }
  }

  // Step Pooled Particles
  const parts = particlePool.activeList;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      particlePool.releaseAt(i);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = 1 - p.life / p.maxLife;
  }

  // Step Pooled Brass Shell Casings
  const casings = casingPool.activeList;
  for (let i = casings.length - 1; i >= 0; i--) {
    const c = casings[i];
    c.life += dt;
    if (c.life >= c.maxLife) {
      casingPool.releaseAt(i);
      continue;
    }
    c.vy += 820 * dt;
    const nx = c.x + c.vx * dt;
    const ny = c.y + c.vy * dt;
    const hit = raycastMap(c.x, c.y, nx, ny, COMPILED_MAP);
    if (hit.hit) {
      c.x = hit.x + hit.nx * 2;
      c.y = hit.y + hit.ny * 2;
      const vn = c.vx * hit.nx + c.vy * hit.ny;
      c.vx = (c.vx - 2 * vn * hit.nx) * 0.55;
      c.vy = (c.vy - 2 * vn * hit.ny) * 0.45;
      c.vAngle *= 0.6;
    } else {
      c.x = nx;
      c.y = ny;
    }
    c.angle += c.vAngle * dt;
  }

  // Step Pooled Floating Damage Numbers
  const floats = floatingTextPool.activeList;
  for (let i = floats.length - 1; i >= 0; i--) {
    const ft = floats[i];
    ft.life += dt;
    if (ft.life >= ft.maxLife) {
      floatingTextPool.releaseAt(i);
      continue;
    }
    ft.x += ft.vx * dt;
    ft.y += ft.vy * dt;
    ft.vy *= 0.92;
  }

  for (let i = activeMuzzleFlashes.length - 1; i >= 0; i--) {
    activeMuzzleFlashes[i].life += dt;
    if (activeMuzzleFlashes[i].life >= activeMuzzleFlashes[i].maxLife) {
      activeMuzzleFlashes.splice(i, 1);
    }
  }

  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    activeExplosions[i].life += dt;
    if (activeExplosions[i].life >= activeExplosions[i].maxLife) {
      activeExplosions.splice(i, 1);
    }
  }

  for (let i = activeMeleeSlashes.length - 1; i >= 0; i--) {
    activeMeleeSlashes[i].life += dt;
    if (activeMeleeSlashes[i].life >= activeMeleeSlashes[i].maxLife) {
      activeMeleeSlashes.splice(i, 1);
    }
  }

  for (let i = activeRagdolls.length - 1; i >= 0; i--) {
    const rg = activeRagdolls[i];
    rg.life += dt;
    if (rg.life >= rg.maxLife) {
      activeRagdolls.splice(i, 1);
      continue;
    }
    rg.vy += 880 * dt;
    const nx = rg.x + rg.vx * dt;
    const ny = rg.y + rg.vy * dt;
    const hit = raycastMap(rg.x, rg.y, nx, ny, COMPILED_MAP);
    if (hit.hit) {
      rg.x = hit.x + hit.nx * rg.r;
      rg.y = hit.y + hit.ny * rg.r;
      const vn = rg.vx * hit.nx + rg.vy * hit.ny;
      rg.vx = (rg.vx - 2 * vn * hit.nx) * 0.5;
      rg.vy = (rg.vy - 2 * vn * hit.ny) * 0.45;
    } else {
      rg.x = nx;
      rg.y = ny;
    }
    rg.angle += rg.vAngle * dt;
  }

  for (let i = directionalHitIndicators.length - 1; i >= 0; i--) {
    directionalHitIndicators[i].alpha -= dt * 1.4;
    if (directionalHitIndicators[i].alpha <= 0) {
      directionalHitIndicators.splice(i, 1);
    }
  }

  updateDynamicCamera(dt);
}

function emitJetpackParticles(px, py, vx, vy, aimAngle) {
  const facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
  const bootOffsets = [-5 * facing, 5 * facing];
  const chance = 0.75 * (userSettings.particleQuality || 1.0);
  for (const bx of bootOffsets) {
    if (Math.random() < chance) {
      const color = Math.random() < 0.45 ? '#00d2d3' : (Math.random() < 0.7 ? '#ff9f43' : '#ff6b6b');
      particlePool.acquire(
        px + bx + (Math.random() - 0.5) * 3,
        py + 16,
        vx * 0.25 + (Math.random() - 0.5) * 40,
        Math.max(120, vy + 180 + Math.random() * 90),
        4.5 + Math.random() * 2.5,
        0.5,
        color,
        0.14 + Math.random() * 0.08,
        0,
        true
      );
    }
  }
}

function addScreenShake(amount) {
  const shakeScale = (userSettings.screenShake ?? 100) / 100;
  const scaled = amount * shakeScale;
  if (scaled <= 0.01) return;
  camera.shakeIntensity = Math.min(28, Math.max(camera.shakeIntensity, scaled));
}

function updateDynamicCamera(dt) {
  if (!joinedGame) {
    const t = performance.now() * 0.00022;
    camera.x = WORLD_WIDTH * 0.5 + Math.sin(t) * 1050;
    camera.y = 720 + Math.cos(t * 1.6) * 180;
    camera.zoom = 1.1;
    return;
  }

  const weapon = getWeapon(localPlayer.activeWeaponId);

  // Responsive viewport scale for small mobile screens so FOV stays balanced
  const mobileScale = Math.min(1.0, Math.max(0.72, window.innerWidth / 1100));

  let targetZoom = BASE_CAMERA_ZOOM * (weapon.cameraZoom || 1.0) * mobileScale;
  let lookAheadFactor = (weapon.lookAhead || 0.78) * (userSettings.aimSensitivity || 1.0);

  if (weapon.allowCustomFov) {
    targetZoom = (BASE_CAMERA_ZOOM * mobileScale) / userSniperFovMult;
    lookAheadFactor = weapon.lookAhead * (0.75 + 0.25 * userSniperFovMult) * (userSettings.aimSensitivity || 1.0);
  }

  const px = localPlayer.x + localPlayer.reconcileOffsetX;
  const py = localPlayer.y + localPlayer.reconcileOffsetY;

  const offsetX = (mouse.screenX - canvas.width / 2) * 0.22 * lookAheadFactor;
  const offsetY = (mouse.screenY - canvas.height / 2) * 0.22 * lookAheadFactor;

  const desiredX = Math.max(240, Math.min(WORLD_WIDTH - 240, px + offsetX));
  const desiredY = Math.max(150, Math.min(WORLD_HEIGHT - 140, py + offsetY));

  const lerpFactor = 1 - Math.exp(-10.5 * dt);
  camera.x += (desiredX - camera.x) * lerpFactor;
  camera.y += (desiredY - camera.y) * lerpFactor;
  camera.zoom += (targetZoom - camera.zoom) * (1 - Math.exp(-7 * dt));

  if (camera.shakeIntensity > 0.1) {
    camera.shakeX = (Math.random() - 0.5) * 2 * camera.shakeIntensity;
    camera.shakeY = (Math.random() - 0.5) * 2 * camera.shakeIntensity;
    camera.shakeIntensity *= Math.exp(-14 * dt);
  } else {
    camera.shakeIntensity = 0;
    camera.shakeX = 0;
    camera.shakeY = 0;
  }
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// ==================== HARDWARE-ACCELERATED CANVAS RENDERING ====================

function renderScene() {
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(
    Math.round(canvas.width / 2 + camera.shakeX),
    Math.round(canvas.height / 2 + camera.shakeY)
  );
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 1. Baked Outpost Background Cave Walls & Bunker Windows
  ctx.drawImage(mapRenderer.bgCanvas, 0, 0);

  // 2. Baked Outpost Foreground Terrain Islands & Bunkers
  ctx.drawImage(mapRenderer.fgCanvas, 0, 0);

  // 3. Weapons & Resources Lying Naturally on the Ground (Zero Glowing!)
  renderGroundWeaponsAndResources(ctx);
  renderDroppedWeapons(ctx);

  // 4. Brass Shell Casings
  renderShellCasings(ctx);

  // 5. Active Bombs (Frag Grenades, M7 Toxic Gas Bombs & Surface-Sticking Proxy Mines)
  renderGrenades(ctx);

  // 6. Ragdoll Body Parts
  renderRagdolls(ctx);

  const lx = localPlayer.x + localPlayer.reconcileOffsetX;
  const ly = localPlayer.y + localPlayer.reconcileOffsetY;
  const nowMs = performance.now();

  // 7. Remote Players (Concealed when hiding inside Stealth Bushes unless firing or very close!)
  for (const rp of remotePlayers.values()) {
    if (rp.renderState.dead) continue;
    const inBush = !!getBushContainingPoint(rp.renderState.x, rp.renderState.y);
    if (inBush) {
      const firedRecently = (nowMs - (rp.lastFireTimeMs || 0)) < 750;
      const distToMe = joinedGame && !localPlayer.dead
        ? Math.hypot(rp.renderState.x - lx, rp.renderState.y - ly)
        : 9999;
      const revealRadius = rp.renderState.crouched ? 64 : 92;
      if (!firedRecently && distToMe > revealRadius) {
        // Completely hidden inside the bush!
        continue;
      }
    }
    const meta = playerRoster.get(rp.id) || { name: `Soldier_${rp.id}`, colorId: rp.id % 8 };
    rp.renderState.inBush = inBush;
    renderSoldier(ctx, rp.renderState, meta.name, meta.colorId, false);
  }

  // 8. Local Player
  if (joinedGame && !localPlayer.dead) {
    const myMeta = playerRoster.get(myPlayerId) || {
      name: playerNameInput.value || 'You',
      colorId: selectedColorId
    };
    const inBush = !!getBushContainingPoint(lx, ly);
    const renderState = {
      x: lx,
      y: ly,
      vx: localPlayer.vx,
      vy: localPlayer.vy,
      aimAngle: localPlayer.aimAngle,
      health: localPlayer.health,
      fuel: localPlayer.fuel,
      activeWeaponId: localPlayer.activeWeaponId,
      jetpackActive: localPlayer.jetpackActive,
      grounded: localPlayer.grounded,
      crouched: localPlayer.crouched,
      burning: localPlayer.burning,
      inBush,
      spawnShield: localPlayer.spawnShield,
      walkPhase: localPlayer.walkPhase
    };
    renderSoldier(ctx, renderState, myMeta.name, myMeta.colorId, true);
  }

  // 8.5. Foreground Stealth Bushes (Rendered over players so soldiers can hide inside them!)
  renderStealthBushes(ctx);

  // 8.8. Lingering M7 Toxic Gas Clouds
  renderGasClouds(ctx);

  // 9. Tracers, Muzzle Flashes, Melee Slashes, Particles & Cartoon Explosions
  renderTracers(ctx);
  renderMuzzleFlashes(ctx);
  renderMeleeSlashes(ctx);
  renderParticles(ctx);
  renderExplosions(ctx);
  renderFloatingTexts(ctx);

  ctx.restore();

  // 10. Screen-Space Overlays & Pointer-Locked Tactical Reticle
  renderScreenSpaceOverlays(ctx);
}

function renderStealthBushes(ctx) {
  const nowSec = performance.now() * 0.001;
  const lx = localPlayer.x + localPlayer.reconcileOffsetX;
  const ly = localPlayer.y + localPlayer.reconcileOffsetY;

  for (let i = 0; i < STEALTH_BUSHES.length; i++) {
    const b = STEALTH_BUSHES[i];
    const distLocal = joinedGame && !localPlayer.dead ? Math.hypot(lx - b.x, ly - b.y) : 999;
    const localInside = distLocal < b.rx * 0.95 && Math.abs(ly - b.y) < b.ry * 1.1;

    // Gentle wind + rustle when a player moves inside
    const sway = Math.sin(nowSec * 1.8 + b.id * 1.7) * 1.8 +
      (localInside ? Math.sin(nowSec * 14) * Math.min(3.5, Math.hypot(localPlayer.vx, localPlayer.vy) * 0.015) : 0);

    ctx.save();
    ctx.translate(b.x, b.y);
    // Semi-transparent when the local player is inside so they can see their own crouched character
    ctx.globalAlpha = localInside ? 0.68 : 0.96;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 3, b.rx * 0.95, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Woody base branches
    ctx.strokeStyle = '#3b2818';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-b.rx * 0.35, 2);
    ctx.lineTo(-b.rx * 0.5 + sway * 0.4, -b.ry * 0.45);
    ctx.moveTo(b.rx * 0.3, 2);
    ctx.lineTo(b.rx * 0.48 + sway * 0.4, -b.ry * 0.42);
    ctx.stroke();

    // Back dark foliage mounds
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#112211';
    ctx.fillStyle = '#1e4620';
    const backLobes = [
      { ox: -b.rx * 0.58, oy: -b.ry * 0.32, r: b.ry * 0.56 },
      { ox: b.rx * 0.58, oy: -b.ry * 0.30, r: b.ry * 0.54 },
      { ox: -b.rx * 0.25, oy: -b.ry * 0.62, r: b.ry * 0.62 },
      { ox: b.rx * 0.26, oy: -b.ry * 0.60, r: b.ry * 0.60 },
      { ox: 0, oy: -b.ry * 0.72, r: b.ry * 0.66 }
    ];
    for (const lb of backLobes) {
      ctx.beginPath();
      ctx.arc(lb.ox + sway * 0.5, lb.oy, lb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Mid vibrant green foliage clusters
    ctx.fillStyle = '#2d6a2e';
    const midLobes = [
      { ox: -b.rx * 0.42, oy: -b.ry * 0.26, r: b.ry * 0.50 },
      { ox: b.rx * 0.42, oy: -b.ry * 0.25, r: b.ry * 0.48 },
      { ox: 0, oy: -b.ry * 0.48, r: b.ry * 0.58 },
      { ox: -b.rx * 0.18, oy: -b.ry * 0.32, r: b.ry * 0.46 },
      { ox: b.rx * 0.20, oy: -b.ry * 0.34, r: b.ry * 0.46 }
    ];
    for (const lb of midLobes) {
      ctx.beginPath();
      ctx.arc(lb.ox + sway * 0.8, lb.oy, lb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Top sunlit leaf highlights
    ctx.fillStyle = '#4ca64c';
    const topHighlights = [
      { ox: -b.rx * 0.32, oy: -b.ry * 0.54, r: b.ry * 0.28 },
      { ox: b.rx * 0.28, oy: -b.ry * 0.50, r: b.ry * 0.26 },
      { ox: 0, oy: -b.ry * 0.68, r: b.ry * 0.32 }
    ];
    for (const hl of topHighlights) {
      ctx.beginPath();
      ctx.arc(hl.ox + sway, hl.oy, hl.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function renderGroundWeaponsAndResources(ctx) {
  const px = localPlayer.x + localPlayer.reconcileOffsetX;
  const py = localPlayer.y + localPlayer.reconcileOffsetY;

  for (let i = 0; i < MAP_WEAPON_PADS.length; i++) {
    const pad = MAP_WEAPON_PADS[i];
    const state = padStates[i];
    if (state <= 0) continue;

    ctx.save();
    ctx.translate(pad.x, pad.y);

    // Subtle natural ground contact shadow underneath the item
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (RESOURCES[pad.weaponId]) {
      drawGroundResourceModel(ctx, pad.weaponId);
    } else {
      ctx.save();
      ctx.translate(-12, -5.5);
      drawWeaponModel(ctx, pad.weaponId, 1.0);
      ctx.restore();
    }

    if (joinedGame && !localPlayer.dead && Math.hypot(pad.x - px, pad.y - py) < 120) {
      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillText(pad.label, 1, -18);
      ctx.fillStyle = pad.weaponId === WEAPON_IDS.FLAMETHROWER ? '#ff9f43' : '#dfe4ea';
      ctx.fillText(pad.label, 0, -19);
    }

    ctx.restore();
  }
}

function drawGroundResourceModel(ctx, resourceId) {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14171a';

  if (resourceId === RESOURCE_IDS.GRENADE_CRATE) {
    ctx.fillStyle = '#4b6b3b';
    ctx.fillRect(-13, -12, 26, 11);
    ctx.strokeRect(-13, -12, 26, 11);

    ctx.fillStyle = '#2d4222';
    ctx.fillRect(-14, -13, 28, 3.5);
    ctx.strokeRect(-14, -13, 28, 3.5);

    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-9, -7, 18, 2.5);
  } else if (resourceId === RESOURCE_IDS.GAS_CRATE) {
    // M7 Toxic Gas Bomb Crate + Miniature M7 Canister on top
    ctx.fillStyle = '#3b5228';
    ctx.fillRect(-13, -11, 26, 10);
    ctx.strokeRect(-13, -11, 26, 10);
    ctx.fillStyle = '#b8e936';
    ctx.fillRect(-9, -7.5, 18, 3.5);
    ctx.save();
    ctx.translate(0, -14);
    drawM7GasBombGraphic(ctx, 0.72);
    ctx.restore();
  } else if (resourceId === RESOURCE_IDS.MINE_CRATE) {
    // Proxy Mine Pack + Miniature 4-pronged Proxy Mine on top
    ctx.fillStyle = '#3d4852';
    ctx.fillRect(-13, -10, 26, 9);
    ctx.strokeRect(-13, -10, 26, 9);
    ctx.save();
    ctx.translate(0, -12);
    drawProxyMineGraphic(ctx, 0.62, true);
    ctx.restore();
  } else if (resourceId === RESOURCE_IDS.AMMO_CRATE) {
    ctx.fillStyle = '#3d5a45';
    ctx.fillRect(-11, -13, 22, 12);
    ctx.strokeRect(-11, -13, 22, 12);

    ctx.fillStyle = '#e67e22';
    ctx.fillRect(-7, -8, 14, 3);
  } else if (resourceId === RESOURCE_IDS.MEDKIT_PACK) {
    ctx.fillStyle = '#dfe4ea';
    ctx.beginPath();
    ctx.roundRect(-11, -12, 22, 11, 2.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-2, -10, 4, 7);
    ctx.fillRect(-4.5, -7.5, 9, 2.5);
  }

  ctx.restore();
}

function renderDroppedWeapons(ctx) {
  for (const dw of serverDroppedWeapons) {
    ctx.save();
    ctx.translate(dw.x, dw.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(-10, -2);
    drawWeaponModel(ctx, dw.weaponId, 0.95);
    ctx.restore();
  }
}

// ==================== PROCEDURAL MINI MILITIA SOLDIER & WEAPON RENDERER ====================

function renderSoldier(ctx, state, name, colorId, isLocal) {
  const palette = SOLDIER_COLORS[colorId] || SOLDIER_COLORS[0];
  const x = state.x;
  const y = state.y;
  const aimAngle = state.aimAngle || 0;
  const facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
  const weapon = getWeapon(state.activeWeaponId);
  const isCrouched = !!state.crouched;
  const crouchDrop = isCrouched ? 6 : 0;
  const shoulderY = -3 + crouchDrop;

  ctx.save();
  ctx.translate(x, y);

  if (isLocal && state.inBush) {
    ctx.globalAlpha = 0.72;
  }

  if (weapon.hasLaser) {
    const cosA = Math.cos(aimAngle);
    const sinA = Math.sin(aimAngle);
    const startX = x + cosA * 28;
    const startY = (y + shoulderY) + sinA * 28;
    const endX = x + cosA * 1800;
    const endY = (y + shoulderY) + sinA * 1800;
    const hit = raycastMap(startX, startY, endX, endY, COMPILED_MAP);

    ctx.save();
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(hit.x, hit.y);
    ctx.strokeStyle = 'rgba(255, 45, 45, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hit.x, hit.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3838';
    ctx.fill();
    ctx.restore();
  } else if (isLocal && userSettings.showCrosshair && !weapon.isMelee) {
    // Subtle tactical aim line for local player (adjustable in Settings)
    const cosA = Math.cos(aimAngle);
    const sinA = Math.sin(aimAngle);
    const startX = x + cosA * 32;
    const startY = (y + shoulderY) + sinA * 32;
    const endX = x + cosA * 460;
    const endY = (y + shoulderY) + sinA * 460;
    const hit = raycastMap(startX, startY, endX, endY, COMPILED_MAP);

    ctx.save();
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(startX, startY);
    ctx.lineTo(hit.x, hit.y);
    ctx.strokeStyle = 'rgba(122, 209, 98, 0.28)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (state.spawnShield > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -2 + crouchDrop * 0.5, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(84, 160, 255, 0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(84, 160, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  if (state.burning) {
    ctx.save();
    const flicker = 0.7 + 0.3 * Math.sin(performance.now() * 0.025);
    ctx.beginPath();
    ctx.arc(0, crouchDrop * 0.5, 22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 127, 0, ${0.22 * flicker})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 220, 0, ${0.65 * flicker})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.scale(facing, 1);

  const walkSwing = state.grounded
    ? Math.sin(state.walkPhase || 0) * (isCrouched ? 3.8 : 6)
    : (state.jetpackActive ? -3 : 2);

  // Jetpack Backpack
  ctx.fillStyle = '#2f3640';
  ctx.strokeStyle = '#14171a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-12, -9 + crouchDrop, 7, 16 - crouchDrop * 0.3, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f39c12';
  ctx.fillRect(-11, -5 + crouchDrop, 5, 4);

  // Legs & Jetpack Boots (Bent knees when crouched)
  for (const legSign of [-1, 1]) {
    const legOffset = legSign * walkSwing;
    ctx.save();
    const legX = isCrouched ? (legSign * 5.2 + legOffset * 0.3) : (legSign * 3.5 + legOffset * 0.4);
    const legY = isCrouched ? 10 : 8;
    const thighH = isCrouched ? 5.5 : 8;
    const bootY = isCrouched ? 3.5 : 6;
    ctx.translate(legX, legY);
    ctx.fillStyle = palette.body;
    ctx.strokeStyle = '#14171a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-3.5, 0, 7, thighH, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#24292e';
    ctx.beginPath();
    ctx.roundRect(-4, bootY, 9, 6, 2);
    ctx.fill();
    ctx.stroke();

    if (state.jetpackActive) {
      ctx.fillStyle = '#00d2d3';
      ctx.fillRect(-2.5, bootY + 5, 5, 2.5);
    }
    ctx.restore();
  }

  // Torso & Vest
  ctx.fillStyle = palette.body;
  ctx.strokeStyle = '#14171a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-8, -9 + crouchDrop, 16, 19 - crouchDrop * 0.4, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.vest;
  ctx.beginPath();
  ctx.roundRect(-7, -6 + crouchDrop, 14, 13 - crouchDrop * 0.35, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e272e';
  ctx.fillRect(-5, 1 + crouchDrop * 0.6, 4, 4);
  ctx.fillRect(1, 1 + crouchDrop * 0.6, 4, 4);

  // Head & Helmet
  ctx.save();
  let localAim = aimAngle;
  if (facing < 0) {
    localAim = Math.PI - aimAngle;
  }
  while (localAim > Math.PI) localAim -= Math.PI * 2;
  while (localAim < -Math.PI) localAim += Math.PI * 2;
  const headTilt = Math.max(-0.35, Math.min(0.35, localAim * 0.45));

  ctx.translate(0, -15 + crouchDrop);
  ctx.rotate(headTilt);

  ctx.fillStyle = '#eab676';
  ctx.strokeStyle = '#14171a';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#14171a';
  ctx.beginPath();
  ctx.arc(4.5, -1, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#14171a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(2, -3.5);
  ctx.lineTo(7, -2.2);
  ctx.stroke();

  ctx.fillStyle = palette.helmet;
  ctx.beginPath();
  ctx.arc(0, -1.5, 10.5, Math.PI * 0.92, Math.PI * 2.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.fillRect(-9.5, -4.5, 19, 3);
  ctx.strokeRect(-9.5, -4.5, 19, 3);
  ctx.restore();

  ctx.restore();

  // Rotating Arms & Equipped Weapon
  ctx.save();
  ctx.translate(0, shoulderY);
  ctx.rotate(aimAngle);
  if (facing < 0) {
    ctx.scale(1, -1);
  }

  drawWeaponModel(ctx, state.activeWeaponId, 1.0);

  ctx.fillStyle = '#eab676';
  ctx.strokeStyle = '#14171a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(8, 3, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!weapon.isMelee) {
    ctx.beginPath();
    ctx.arc(20, 2.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Floating Nametag & Health Bar
  if (!isLocal) {
    const tagYOffset = crouchDrop;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(name, 1, -37 + tagYOffset);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 0, -38 + tagYOffset);

    const hpW = 34;
    const hpPct = Math.max(0, Math.min(1, state.health / MAX_HEALTH));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(-hpW / 2, -33 + tagYOffset, hpW, 4.5);
    ctx.fillStyle = hpPct > 0.45 ? '#2ed573' : '#ff4757';
    ctx.fillRect(-hpW / 2, -33 + tagYOffset, hpW * hpPct, 4.5);
  }

  ctx.restore();
}

function drawWeaponModel(ctx, weaponId, scale = 1.0) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#14171a';

  if (weaponId === WEAPON_IDS.M249) {
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(-6, -3, 8, 7);
    ctx.strokeRect(-6, -3, 8, 7);

    ctx.fillStyle = '#57606f';
    ctx.fillRect(2, -4.5, 20, 8);
    ctx.strokeRect(2, -4.5, 20, 8);

    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(9, 3.5, 10, 9);
    ctx.strokeRect(9, 3.5, 10, 9);

    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(11, -1, 5, 4.5);

    ctx.fillStyle = '#3d444c';
    ctx.fillRect(22, -3.5, 11, 5.5);
    ctx.strokeRect(22, -3.5, 11, 5.5);

    ctx.fillStyle = '#747d8c';
    ctx.fillRect(33, -2, 8, 3);
    ctx.strokeRect(33, -2, 8, 3);
  } else if (weaponId === WEAPON_IDS.FLAMETHROWER) {
    // M2-A1 Rare Flamethrower: Pressurized red/amber fuel tank + vented heat shroud + pilot flame
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(-7, -3, 9, 6);
    ctx.strokeRect(-7, -3, 9, 6);

    // Under-slung pressurized fuel cylinder
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.roundRect(4, 2.5, 17, 7.5, 3.5);
    ctx.fill();
    ctx.stroke();

    // Yellow hazard band on fuel tank
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(10, 2.8, 4, 7);

    // Main receiver & pressure manifold
    ctx.fillStyle = '#485460';
    ctx.fillRect(2, -4.2, 18, 7);
    ctx.strokeRect(2, -4.2, 18, 7);

    // Perforated barrel heat shroud
    ctx.fillStyle = '#636e72';
    ctx.fillRect(20, -3.5, 14, 5.5);
    ctx.strokeRect(20, -3.5, 14, 5.5);

    // Nozzle & igniter tip
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(34, -2.2, 5, 3.2);
    ctx.strokeRect(34, -2.2, 5, 3.2);

    // Flickering pilot flame at nozzle
    const flicker = 0.8 + 0.3 * Math.sin(performance.now() * 0.03);
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(41, -0.5, 3.2 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff200';
    ctx.beginPath();
    ctx.arc(40.5, -0.5, 1.6 * flicker, 0, Math.PI * 2);
    ctx.fill();
  } else if (weaponId === WEAPON_IDS.SNIPER) {
    ctx.fillStyle = '#4b6b3b';
    ctx.fillRect(-8, -2.5, 26, 6);
    ctx.strokeRect(-8, -2.5, 26, 6);

    ctx.fillStyle = '#2f3640';
    ctx.fillRect(18, -1.8, 28, 3);
    ctx.strokeRect(18, -1.8, 28, 3);
    ctx.fillRect(44, -2.8, 4, 5);

    ctx.fillStyle = '#1e272e';
    ctx.fillRect(3, -7.5, 16, 3.8);
    ctx.strokeRect(3, -7.5, 16, 3.8);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(18, -7, 1.5, 2.8);
  } else if (weaponId === WEAPON_IDS.SHOTGUN) {
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(-5, -2.5, 19, 6);
    ctx.strokeRect(-5, -2.5, 19, 6);

    ctx.fillStyle = '#636e72';
    ctx.fillRect(14, -3, 20, 3);
    ctx.strokeRect(14, -3, 20, 3);
    ctx.fillRect(14, 0, 18, 2.5);

    ctx.fillStyle = '#d35400';
    ctx.fillRect(16, 0.5, 10, 4);
    ctx.strokeRect(16, 0.5, 10, 4);
  } else if (weaponId === WEAPON_IDS.RPG) {
    ctx.fillStyle = '#8c5828';
    ctx.fillRect(-12, -2.8, 24, 5.6);
    ctx.strokeRect(-12, -2.8, 24, 5.6);

    ctx.fillStyle = '#57606f';
    ctx.fillRect(12, -3.2, 16, 6.4);
    ctx.strokeRect(12, -3.2, 16, 6.4);

    ctx.fillStyle = '#4b6b3b';
    ctx.beginPath();
    ctx.moveTo(28, -3);
    ctx.lineTo(35, -7);
    ctx.lineTo(43, 0);
    ctx.lineTo(35, 7);
    ctx.lineTo(28, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (weaponId === WEAPON_IDS.MACHETE) {
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(2, -2, 8, 4.5);
    ctx.strokeRect(2, -2, 8, 4.5);

    ctx.fillStyle = '#dfe4ea';
    ctx.beginPath();
    ctx.moveTo(10, -2.5);
    ctx.lineTo(28, -4.5);
    ctx.quadraticCurveTo(33, -1, 29, 3);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(-6, -2.5, 8, 5.5);
    ctx.strokeRect(-6, -2.5, 8, 5.5);

    ctx.fillStyle = '#57606f';
    ctx.fillRect(2, -3.5, 16, 6.5);
    ctx.strokeRect(2, -3.5, 16, 6.5);

    ctx.fillStyle = '#2f3640';
    ctx.beginPath();
    ctx.moveTo(10, 3);
    ctx.lineTo(15, 3);
    ctx.lineTo(17, 10);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3d444c';
    ctx.fillRect(18, -2.8, 9, 4.8);
    ctx.strokeRect(18, -2.8, 9, 4.8);

    ctx.fillStyle = '#747d8c';
    ctx.fillRect(27, -1.5, 8, 2.5);
    ctx.strokeRect(27, -1.5, 8, 2.5);
  }

  ctx.restore();
}

// ==================== EFFECTS, TRACERS, BOMBS & OVERLAYS RENDERING ====================

function renderTracers(ctx) {
  const tracers = tracerPool.activeList;
  for (let i = 0; i < tracers.length; i++) {
    const tr = tracers[i];
    if (tr.isRocket) {
      const angle = Math.atan2(tr.vy, tr.vx);
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#4b6b3b';
      ctx.strokeStyle = '#14171a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -3.5);
      ctx.lineTo(6, -4.5);
      ctx.lineTo(12, 0);
      ctx.lineTo(6, 4.5);
      ctx.lineTo(-8, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.arc(-10, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (tr.isFlame) {
      // Expanding cel-shaded Flamethrower fire stream
      const t = Math.max(0, Math.min(1, tr.life / tr.maxLife));
      const r = 6 + t * 22;
      const alpha = Math.max(0, 1 - Math.pow(t, 1.35));
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.globalAlpha = alpha;

      // Outer crimson/orange flame billow with dark cartoon outline
      ctx.fillStyle = t < 0.45 ? '#ff7f00' : (t < 0.78 ? '#eb2f06' : '#576574');
      ctx.strokeStyle = '#14171a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      if (t < 0.75) ctx.stroke();

      // Inner bright yellow-white core
      if (t < 0.65) {
        ctx.fillStyle = t < 0.25 ? '#ffffff' : '#fff200';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      const speed = Math.hypot(tr.vx, tr.vy) || 1;
      const tailLen = tr.weaponId === WEAPON_IDS.SNIPER ? 75 : 38;
      const tailX = tr.x - (tr.vx / speed) * tailLen;
      const tailY = tr.y - (tr.vy / speed) * tailLen;

      const grad = ctx.createLinearGradient(tailX, tailY, tr.x, tr.y);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.7, tr.color);
      grad.addColorStop(1, '#ffffff');

      ctx.strokeStyle = grad;
      ctx.lineWidth = tr.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tr.x, tr.y);
      ctx.stroke();
    }
  }
}

function renderMuzzleFlashes(ctx) {
  for (const mf of activeMuzzleFlashes) {
    ctx.save();
    ctx.translate(mf.x, mf.y);
    ctx.rotate(mf.angle);
    const alpha = 1 - mf.life / mf.maxLife;
    ctx.fillStyle = mf.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, -mf.size * 0.45);
    ctx.lineTo(mf.size * 1.35, 0);
    ctx.lineTo(0, mf.size * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, 0, mf.size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderMeleeSlashes(ctx) {
  for (const ms of activeMeleeSlashes) {
    const progress = ms.life / ms.maxLife;
    ctx.save();
    ctx.translate(ms.x, ms.y - 3);
    ctx.rotate(ms.angle);
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
    ctx.lineWidth = 6 * (1 - progress * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 44, -0.85, 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

// Reference Image 1: Yellow-Green Cylindrical "M7 GAS" Bomb Canister
function drawM7GasBombGraphic(ctx, scale = 1.0) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.7;
  ctx.strokeStyle = '#14171a';

  // Side safety spoon lever handle (left side)
  ctx.fillStyle = '#3b4d28';
  ctx.beginPath();
  ctx.moveTo(-5, -9);
  ctx.lineTo(-9.5, -7.5);
  ctx.lineTo(-9.5, 4);
  ctx.lineTo(-7.2, 4.5);
  ctx.lineTo(-7.2, -5.8);
  ctx.lineTo(-4, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top mechanical fuse neck & cap
  ctx.fillStyle = '#4a5d32';
  ctx.fillRect(-3.5, -11.5, 7, 3.5);
  ctx.strokeRect(-3.5, -11.5, 7, 3.5);

  // Pull-pin ring
  ctx.beginPath();
  ctx.arc(-5.5, -9.5, 2.2, 0, Math.PI * 2);
  ctx.stroke();

  // Main cylindrical yellow-green canister body
  ctx.fillStyle = '#9ec432';
  ctx.beginPath();
  ctx.roundRect(-6.5, -8, 13, 16, 2.2);
  ctx.fill();
  ctx.stroke();

  // Lighter yellow-green vertical specular highlight on cylinder
  ctx.fillStyle = '#c8e65a';
  ctx.fillRect(-4.5, -7, 3.5, 14);

  // Top & bottom dark olive-charcoal crimps/bands
  ctx.fillStyle = '#2d3822';
  ctx.fillRect(-6.5, -5.5, 13, 2.2);
  ctx.fillRect(-6.5, 3.8, 13, 2.2);

  // Stenciled "M7 GAS" label
  ctx.fillStyle = '#14171a';
  ctx.font = '900 4.2px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M7 GAS', 0.4, 0.8);

  ctx.restore();
}

// Reference Image 2: Circular Metallic 4-Pronged Proxy Mine with Glowing Green Center LED
function drawProxyMineGraphic(ctx, scale = 1.0, armedLed = true) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#14171a';

  // 4 symmetrical outer mounting prongs/ears at 45°, 135°, 225°, 315°
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.rotate(Math.PI * 0.25 + k * Math.PI * 0.5);
    ctx.fillStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(6, -3.6);
    ctx.lineTo(12.5, -4.4);
    ctx.lineTo(13.2, 0);
    ctx.lineTo(12.5, 4.4);
    ctx.lineTo(6, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner dark prong notch/bolt slot
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(8.8, -1.6, 2.4, 3.2);
    ctx.restore();
  }

  // Outer light-grey metallic circular bezel
  ctx.fillStyle = '#b2bec3';
  ctx.beginPath();
  ctx.arc(0, 0, 8.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Middle dark charcoal metallic ring
  ctx.fillStyle = '#2d3436';
  ctx.beginPath();
  ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner metallic ring around the LED
  ctx.fillStyle = '#dfe6e9';
  ctx.beginPath();
  ctx.arc(0, 0, 4.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing bright green circular center LED
  ctx.fillStyle = armedLed ? '#39ff14' : '#a3cb38';
  ctx.beginPath();
  ctx.arc(0, 0, 2.7, 0, Math.PI * 2);
  ctx.fill();

  // Glossy white highlight on the green LED
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-0.8, -0.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderGrenades(ctx) {
  const nowMs = performance.now();
  const blink = Math.floor(nowMs / 110) % 2 === 0;
  const lx = localPlayer.x + localPlayer.reconcileOffsetX;
  const ly = localPlayer.y + localPlayer.reconcileOffsetY;

  for (const g of serverGrenades) {
    ctx.save();
    ctx.translate(g.x, g.y);

    if (g.bombType === BOMB_IDS.GAS) {
      // Rotate canister slightly while tumbling in flight
      const spin = (Math.hypot(g.vx, g.vy) > 12) ? (nowMs * 0.008) : 0;
      ctx.rotate(spin);
      drawM7GasBombGraphic(ctx, 1.05);

      // Hissing green gas trail in flight
      if (blink || g.fuse < 0.7) {
        ctx.fillStyle = '#b8e936';
        ctx.beginPath();
        ctx.arc(0, -13, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (g.bombType === BOMB_IDS.MINE) {
      // Proxy Mine: Sticks to walls, ceilings, or floors, compact size & destructible!
      const isMineOwner = g.ownerId === myPlayerId;
      const distToMe = Math.hypot(g.x - lx, g.y - ly);

      if (g.stuck && !g.arming && !isMineOwner) {
        // Low-profile stealth to enemies, but faintly visible so watchful players can spot & shoot it
        ctx.globalAlpha = distToMe < 110 ? 0.78 : 0.36;
      } else {
        ctx.globalAlpha = 0.96;
      }

      if (isMineOwner && g.stuck) {
        // Show subtle green proximity sensor radius ring for the owner
        ctx.strokeStyle = g.arming
          ? 'rgba(255, 200, 50, 0.25)'
          : 'rgba(57, 255, 20, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const pulseLed = !g.arming && (Math.floor(nowMs / 240) % 2 === 0 || distToMe < 90);
      drawProxyMineGraphic(ctx, 0.68, pulseLed);
    } else {
      // Classic Frag Grenade
      ctx.fillStyle = '#3b6e2c';
      ctx.strokeStyle = '#14171a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (blink || g.fuse < 0.8) {
        ctx.fillStyle = '#ff3838';
        ctx.beginPath();
        ctx.arc(0, -7, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (g.fuse < 1.2) {
        ctx.strokeStyle = 'rgba(255, 71, 87, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 12 + (1.2 - g.fuse) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

function renderGasClouds(ctx) {
  const nowSec = performance.now() * 0.001;
  for (const gc of activeGasClouds) {
    const fadeIn = Math.min(1, gc.life / 0.35);
    const fadeOut = Math.min(1, (gc.maxLife - gc.life) / 1.2);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    if (alpha <= 0.01) continue;

    ctx.save();
    ctx.translate(gc.x, gc.y);

    // Core toxic green ambient haze
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, gc.radius);
    grad.addColorStop(0, `rgba(184, 233, 54, ${0.46 * alpha})`);
    grad.addColorStop(0.65, `rgba(106, 176, 76, ${0.34 * alpha})`);
    grad.addColorStop(1, 'rgba(46, 213, 115, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, gc.radius, 0, Math.PI * 2);
    ctx.fill();

    // Billowing cartoon toxic cloud puffs
    for (let i = 0; i < gc.puffs.length; i++) {
      const pf = gc.puffs[i];
      const wobbleX = Math.cos(nowSec * pf.speed + pf.phase) * 10;
      const wobbleY = Math.sin(nowSec * pf.speed * 1.2 + pf.phase) * 8;
      const pr = pf.r * (0.9 + 0.15 * Math.sin(nowSec * 2.2 + pf.phase));

      ctx.save();
      ctx.globalAlpha = alpha * 0.52;
      ctx.fillStyle = pf.shade;
      ctx.strokeStyle = 'rgba(20, 35, 18, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pf.ox + wobbleX, pf.oy + wobbleY, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Pulsing toxic hazard perimeter ring
    ctx.strokeStyle = `rgba(184, 233, 54, ${0.42 * alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, gc.radius * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}

function renderShellCasings(ctx) {
  const casings = casingPool.activeList;
  for (let i = 0; i < casings.length; i++) {
    const c = casings[i];
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.globalAlpha = Math.min(1, (c.maxLife - c.life) * 2);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.length / 2, -1.4, c.length, 2.8);
    ctx.restore();
  }
}

function renderRagdolls(ctx) {
  for (const rg of activeRagdolls) {
    ctx.save();
    ctx.translate(rg.x, rg.y);
    ctx.rotate(rg.angle);
    ctx.globalAlpha = Math.min(1, (rg.maxLife - rg.life) * 1.2);
    ctx.fillStyle = rg.color;
    ctx.strokeStyle = '#14171a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rg.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function renderParticles(ctx) {
  const parts = particlePool.activeList;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const t = p.life / p.maxLife;
    const r = p.size + (p.endSize - p.size) * t;
    if (r <= 0.1) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (p.outlined && r > 3.2) {
      ctx.strokeStyle = '#14171a';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Cartoonish Comic-Book RPG & Grenade Blast Animation
function renderExplosions(ctx) {
  for (const ex of activeExplosions) {
    const t = Math.max(0, Math.min(1, ex.life / ex.maxLife));
    const radius = ex.maxRadius * Math.pow(t, 0.42);
    const alpha = Math.max(0, 1 - t);

    ctx.save();
    ctx.translate(ex.x, ex.y);

    // 1. Outer Cartoon Shockwave Ring + Dual Sonic Wave
    ctx.strokeStyle = `rgba(255, 242, 0, ${alpha * 0.9})`;
    ctx.lineWidth = 9 * (1 - t * 0.65);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(20, 23, 26, ${alpha * 0.85})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Cel-Shaded Billowing Cartoon Fire & Smoke Cloud Puffs
    if (ex.puffs) {
      for (let i = 0; i < ex.puffs.length; i++) {
        const pf = ex.puffs[i];
        const dist = radius * pf.distFrac * (0.55 + t * 0.65);
        const px = Math.cos(pf.angle + t * 0.4) * dist;
        const py = Math.sin(pf.angle + t * 0.4) * dist;
        const pr = ex.maxRadius * pf.sizeFrac * (1 - t * 0.45);
        if (pr <= 1) continue;

        ctx.save();
        ctx.globalAlpha = alpha * 0.92;
        if (pf.isSmoke && t > 0.28) {
          ctx.fillStyle = t > 0.55 ? '#2f3640' : '#576574';
        } else {
          ctx.fillStyle = t < 0.3 ? '#ff9f43' : '#ee5253';
        }
        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Jagged 12-Point Comic Starburst Core ("BOOM!" Star)
    if (t < 0.65) {
      const starT = t / 0.65;
      const starOuter = ex.maxRadius * (0.72 - starT * 0.25);
      const starInner = starOuter * 0.44;
      const spikes = 12;

      ctx.save();
      ctx.rotate(ex.seedAngle || 0);
      ctx.globalAlpha = 1 - starT * 0.7;

      // Outer orange-red starburst with thick black comic ink outline
      ctx.fillStyle = '#ff793f';
      ctx.strokeStyle = '#14171a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let s = 0; s < spikes * 2; s++) {
        const r = s % 2 === 0 ? starOuter : starInner;
        const a = (s / (spikes * 2)) * Math.PI * 2;
        if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner bright yellow-white core starburst
      ctx.fillStyle = starT < 0.35 ? '#ffffff' : '#fff200';
      ctx.beginPath();
      for (let s = 0; s < spikes * 2; s++) {
        const r = (s % 2 === 0 ? starOuter : starInner) * 0.62;
        const a = (s / (spikes * 2)) * Math.PI * 2;
        if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}

function renderFloatingTexts(ctx) {
  const floats = floatingTextPool.activeList;
  ctx.save();
  ctx.textAlign = 'center';
  for (let i = 0; i < floats.length; i++) {
    const ft = floats[i];
    const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${ft.size}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();
}

function renderScreenSpaceOverlays(ctx) {
  if (!joinedGame) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (const ind of directionalHitIndicators) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ind.angle);
    ctx.strokeStyle = `rgba(255, 56, 56, ${ind.alpha * 0.85})`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 115, -0.38, 0.38);
    ctx.stroke();
    ctx.restore();
  }

  if (!localPlayer.dead && localPlayer.health < 35) {
    const pulse = 0.25 + 0.15 * Math.sin(performance.now() * 0.01);
    const grad = ctx.createRadialGradient(cx, cy, canvas.height * 0.3, cx, cy, canvas.width * 0.65);
    grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
    grad.addColorStop(1, `rgba(220, 20, 30, ${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Custom Screen-Space Tactical Crosshair Reticle when Pointer-Locked on PC
  if (
    touchMode !== 'on' &&
    !isPausedMenuOpen &&
    !isSettingsModalOpen &&
    !isTabScoreboardOpen &&
    !matchEnded
  ) {
    const mx = mouse.screenX;
    const my = mouse.screenY;
    ctx.save();
    ctx.translate(mx, my);

    // Outer dark contrast ring
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Crisp neon-green tactical reticle ring & cross ticks
    ctx.strokeStyle = '#7bed9f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.moveTo(-14, 0);
    ctx.lineTo(-5, 0);
    ctx.moveTo(5, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -5);
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 14);
    ctx.stroke();

    // Center precision dot
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ==================== HUD, MATCH CLOCK, RADAR & PREVIEW UPDATES ====================

let lastWeaponIcon0 = -1;
let lastWeaponIcon1 = -1;

function formatClockMMSS(totalSeconds) {
  const sec = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateHUD(dt) {
  if (!joinedGame) {
    renderStartScreenSoldierPreview();
    return;
  }

  // 1. Update Match Countdown Clock
  matchTimerDisplay.textContent = formatClockMMSS(matchRemainingSec);
  if (matchRemainingSec <= 15 && !matchEnded) {
    matchTimerDisplay.className = 'match-timer-digits critical';
  } else if (matchRemainingSec <= 60 && !matchEnded) {
    matchTimerDisplay.className = 'match-timer-digits warning';
  } else {
    matchTimerDisplay.className = 'match-timer-digits';
  }

  // 2. Health (Life) & Jetpack (Rocket Gas) Bars
  if (localPlayer.trailHealth > localPlayer.health) {
    localPlayer.trailHealth = Math.max(localPlayer.health, localPlayer.trailHealth - 45 * dt);
  } else {
    localPlayer.trailHealth = localPlayer.health;
  }

  const hpPct = Math.max(0, Math.min(100, localPlayer.health));
  hpBarFill.style.width = `${hpPct}%`;
  hpDamageTrail.style.width = `${Math.max(0, Math.min(100, localPlayer.trailHealth))}%`;
  hpValueText.textContent = `${Math.ceil(hpPct)}%`;

  const isRegen = !localPlayer.dead &&
    localPlayer.health < MAX_HEALTH &&
    (performance.now() - localPlayer.lastDamageLocalTime) > HEALTH_REGEN_DELAY * 1000;
  hpStatusTag.classList.toggle('hidden', !isRegen);

  // Stealth Bush & Crouch HUD Badges
  const lx = localPlayer.x + localPlayer.reconcileOffsetX;
  const ly = localPlayer.y + localPlayer.reconcileOffsetY;
  const inBush = !localPlayer.dead && !!getBushContainingPoint(lx, ly);
  if (stealthStatusTag) {
    stealthStatusTag.classList.toggle('hidden', !inBush);
  }
  if (crouchStatusTag) {
    crouchStatusTag.classList.toggle('hidden', localPlayer.dead || !localPlayer.crouched);
  }

  const fuelPct = Math.max(0, Math.min(100, Math.round(localPlayer.fuel)));
  fuelBarFill.style.width = `${fuelPct}%`;
  fuelValueText.textContent = `${fuelPct}%`;

  const activeWeapon = getWeapon(localPlayer.activeWeaponId);
  weightPenaltyTag.classList.toggle('hidden', activeWeapon.speedMultiplier >= 0.99);

  // Sniper-only FOV panel visibility
  sniperFovPanel.classList.toggle('hidden', !activeWeapon.allowCustomFov);

  updateWeaponSlotHUD(false);

  const curSlot = localPlayer.slots[localPlayer.activeSlot];
  const curWeapon = getWeapon(curSlot.id);
  if (curWeapon.isMelee) {
    ammoMagEl.textContent = 'INF';
    ammoReserveEl.textContent = 'MELEE';
  } else {
    ammoMagEl.textContent = String(curSlot.mag);
    ammoReserveEl.textContent = String(curSlot.reserve);
  }

  reloadBadge.classList.toggle('hidden', !localPlayer.reloading);
  reloadBarFill.style.width = localPlayer.reloading ? `${localPlayer.reloadPct}%` : '0%';

  // 3-Bomb Selector HUD Update (Frag, M7 Gas, Proxy Mine)
  const fCnt = localPlayer.bombs[BOMB_IDS.FRAG] || 0;
  const gCnt = localPlayer.bombs[BOMB_IDS.GAS] || 0;
  const mCnt = localPlayer.bombs[BOMB_IDS.MINE] || 0;
  const activeType = localPlayer.activeBombType || BOMB_IDS.FRAG;

  if (bombCount1) bombCount1.textContent = String(fCnt);
  if (bombCount2) bombCount2.textContent = String(gCnt);
  if (bombCount3) bombCount3.textContent = String(mCnt);

  if (bombPill1) {
    bombPill1.classList.toggle('active', activeType === BOMB_IDS.FRAG);
    bombPill1.classList.toggle('empty', fCnt <= 0);
  }
  if (bombPill2) {
    bombPill2.classList.toggle('active', activeType === BOMB_IDS.GAS);
    bombPill2.classList.toggle('empty', gCnt <= 0);
  }
  if (bombPill3) {
    bombPill3.classList.toggle('active', activeType === BOMB_IDS.MINE);
    bombPill3.classList.toggle('empty', mCnt <= 0);
  }

  const bMeta = BOMB_META[activeType] || BOMB_META[BOMB_IDS.FRAG];
  if (activeBombLabel) {
    activeBombLabel.textContent = `${bMeta.shortName} [G]`;
    activeBombLabel.style.color = bMeta.color;
  }
  if (mobileBombLabel) {
    mobileBombLabel.textContent = `${bMeta.shortName} (${localPlayer.bombs[activeType] || 0})`;
  }
  if (mobileBombIcon) {
    mobileBombIcon.textContent = activeType === BOMB_IDS.GAS ? '☣️' : (activeType === BOMB_IDS.MINE ? '🟢' : '💣');
  }

  updatePickupPrompt();

  // 4. 5-Second Respawn Banner with Killer's Name
  if (localPlayer.dead && !matchEnded) {
    respawnBanner.classList.remove('hidden');
    const rem = Math.max(0, localPlayer.respawnTimer);
    respawnCountdown.textContent = rem.toFixed(1);
    const pct = Math.max(0, Math.min(100, (rem / RESPAWN_TIME) * 100));
    respawnProgressBar.style.width = `${pct}%`;
  } else {
    respawnBanner.classList.add('hidden');
  }

  renderTacticalRadar();
}

function updateWeaponSlotHUD(force) {
  const s0 = localPlayer.slots[0];
  const s1 = localPlayer.slots[1];
  const w0 = getWeapon(s0.id);
  const w1 = getWeapon(s1.id);

  weaponSlot0El.classList.toggle('active', localPlayer.activeSlot === 0);
  weaponSlot1El.classList.toggle('active', localPlayer.activeSlot === 1);
  weaponName0.textContent = w0.shortName;
  weaponName1.textContent = w1.shortName;

  if (force || lastWeaponIcon0 !== s0.id) {
    lastWeaponIcon0 = s0.id;
    drawSlotWeaponIcon(weaponIcon0, s0.id);
  }
  if (force || lastWeaponIcon1 !== s1.id) {
    lastWeaponIcon1 = s1.id;
    drawSlotWeaponIcon(weaponIcon1, s1.id);
  }
}

function drawSlotWeaponIcon(canvasEl, weaponId) {
  const c = canvasEl.getContext('2d');
  c.clearRect(0, 0, canvasEl.width, canvasEl.height);
  c.save();
  c.translate(canvasEl.width * 0.36, canvasEl.height * 0.52);
  drawWeaponModel(c, weaponId, 1.15);
  c.restore();
}

function updatePickupPrompt() {
  if (localPlayer.dead || matchEnded) {
    pickupPrompt.classList.add('hidden');
    mobilePickupBtn.classList.add('hidden');
    return;
  }

  const px = localPlayer.x + localPlayer.reconcileOffsetX;
  const py = localPlayer.y + localPlayer.reconcileOffsetY;
  let foundName = null;

  for (const dw of serverDroppedWeapons) {
    if (Math.hypot(dw.x - px, dw.y - py) < PICKUP_INTERACT_RADIUS) {
      foundName = getWeapon(dw.weaponId).name;
      break;
    }
  }

  if (!foundName) {
    for (let i = 0; i < MAP_WEAPON_PADS.length; i++) {
      if (padStates[i] > 0) {
        const pad = MAP_WEAPON_PADS[i];
        if (Math.hypot(pad.x - px, pad.y - py) < PICKUP_INTERACT_RADIUS) {
          foundName = getPickupInfo(pad.weaponId).name;
          break;
        }
      }
    }
  }

  if (foundName) {
    pickupWeaponName.textContent = foundName;
    pickupPrompt.classList.remove('hidden');
    mobilePickupBtn.classList.remove('hidden');
  } else {
    pickupPrompt.classList.add('hidden');
    mobilePickupBtn.classList.add('hidden');
  }
}

function updateLeaderboardHUD() {
  const list = [];
  if (joinedGame && myPlayerId) {
    const meta = playerRoster.get(myPlayerId) || { name: playerNameInput.value || 'You', colorId: selectedColorId };
    list.push({
      id: myPlayerId,
      name: meta.name,
      colorId: meta.colorId,
      kills: localPlayer.kills,
      deaths: localPlayer.deaths,
      isMe: true
    });
  }

  for (const rp of remotePlayers.values()) {
    const meta = playerRoster.get(rp.id) || { name: `Soldier_${rp.id}`, colorId: rp.id % 8 };
    list.push({
      id: rp.id,
      name: meta.name,
      colorId: meta.colorId,
      kills: rp.kills || 0,
      deaths: rp.deaths || 0,
      isMe: false
    });
  }

  list.sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths));

  leaderboardList.innerHTML = '';
  for (const row of list.slice(0, 6)) {
    const col = (SOLDIER_COLORS[row.colorId] || SOLDIER_COLORS[0]).accent;
    const div = document.createElement('div');
    div.className = 'lb-row' + (row.isMe ? ' me' : '');
    div.innerHTML = `
      <div class="lb-player">
        <span class="lb-dot" style="background:${col}"></span>
        <span>${escapeHtml(row.name)}</span>
      </div>
      <div class="lb-stats">
        <span>${row.kills}</span>
        <span>${row.deaths}</span>
      </div>
    `;
    leaderboardList.appendChild(div);
  }
}

function renderLiveTabScoreboard() {
  if (!tabScoreboardBody) return;

  const list = [];
  if (joinedGame && myPlayerId) {
    const meta = playerRoster.get(myPlayerId) || {
      name: playerNameInput.value || 'You',
      colorId: selectedColorId,
      isBot: false,
      isAdmin: isLocalAdmin
    };
    list.push({
      id: myPlayerId,
      name: meta.name,
      colorId: meta.colorId,
      isBot: !!meta.isBot,
      isAdmin: !!meta.isAdmin || isLocalAdmin,
      dead: !!localPlayer.dead,
      kills: localPlayer.kills || 0,
      deaths: localPlayer.deaths || 0,
      ping: currentPingMs || localPlayer.ping || 1,
      isMe: true
    });
  }

  for (const rp of remotePlayers.values()) {
    const meta = playerRoster.get(rp.id) || {
      name: `Soldier_${rp.id}`,
      colorId: rp.id % 8,
      isBot: false,
      isAdmin: rp.id === currentAdminId
    };
    list.push({
      id: rp.id,
      name: meta.name,
      colorId: meta.colorId,
      isBot: !!meta.isBot,
      isAdmin: !!meta.isAdmin || rp.id === currentAdminId,
      dead: !!rp.renderState.dead,
      kills: rp.kills || 0,
      deaths: rp.deaths || 0,
      ping: meta.isBot ? 0 : (rp.ping || 1),
      isMe: false
    });
  }

  // Sort by Highest Kills, then Fewest Deaths
  list.sort((a, b) => (b.kills - a.kills) || (a.deaths - b.deaths));

  tabScoreboardBody.innerHTML = '';
  list.forEach((row, index) => {
    const rank = index + 1;
    const tr = document.createElement('tr');
    if (rank === 1) tr.className = 'rank-1';
    const col = (SOLDIER_COLORS[row.colorId] || SOLDIER_COLORS[0]).accent;
    const meTag = row.isMe ? ' <span style="color:#7ad162;font-weight:900;">(YOU)</span>' : '';
    const adminTag = row.isAdmin ? ' <span style="color:#f1c40f;font-size:11px;">★ ADMIN</span>' : '';
    const kdVal = row.deaths > 0 ? (row.kills / row.deaths).toFixed(2) : row.kills.toFixed(2);

    let pingHtml = '';
    if (row.isBot) {
      pingHtml = '<span style="color:#a4b0be;">BOT (0 ms)</span>';
    } else {
      const pMs = Math.max(1, Math.round(row.ping));
      const dotClass = pMs < 45 ? 'good' : (pMs < 100 ? 'warn' : 'bad');
      pingHtml = `<span class="ping-dot ${dotClass}"></span>${pMs} ms`;
    }

    const statusHtml = row.dead
      ? '<span class="status-pill dead">DEAD</span>'
      : '<span class="status-pill alive">ALIVE</span>';

    tr.innerHTML = `
      <td><span class="rank-badge">#${rank}</span></td>
      <td>
        <span class="lb-dot" style="display:inline-block;background:${col};margin-right:6px;"></span>
        <strong>${escapeHtml(row.name)}</strong>${meTag}${adminTag}
      </td>
      <td>${statusHtml}</td>
      <td><strong>${row.kills}</strong></td>
      <td>${row.deaths}</td>
      <td><strong>${kdVal}</strong></td>
      <td class="ping-cell">${pingHtml}</td>
    `;
    tabScoreboardBody.appendChild(tr);
  });
}

function renderTacticalRadar() {
  const rw = radarCanvas.width;
  const rh = radarCanvas.height;
  radarCtx.fillStyle = '#090d11';
  radarCtx.fillRect(0, 0, rw, rh);

  const sx = rw / WORLD_WIDTH;
  const sy = rh / WORLD_HEIGHT;

  radarCtx.fillStyle = '#4c5660';
  for (const poly of COMPILED_MAP.polygons) {
    radarCtx.beginPath();
    poly.vertices.forEach((v, idx) => {
      if (idx === 0) radarCtx.moveTo(v.x * sx, v.y * sy);
      else radarCtx.lineTo(v.x * sx, v.y * sy);
    });
    radarCtx.closePath();
    radarCtx.fill();
  }

  radarCtx.fillStyle = '#f39c12';
  for (let i = 0; i < MAP_WEAPON_PADS.length; i++) {
    if (padStates[i] > 0) {
      const pad = MAP_WEAPON_PADS[i];
      radarCtx.fillRect(pad.x * sx - 1, pad.y * sy - 1, 2, 2);
    }
  }

  const nowMs = performance.now();
  radarCtx.fillStyle = '#ff4757';
  for (const rp of remotePlayers.values()) {
    if (rp.renderState.dead) continue;
    // Enemies hiding in Stealth Bushes are also hidden from radar unless firing!
    if (getBushContainingPoint(rp.renderState.x, rp.renderState.y) && (nowMs - (rp.lastFireTimeMs || 0)) > 750) {
      continue;
    }
    radarCtx.beginPath();
    radarCtx.arc(rp.renderState.x * sx, rp.renderState.y * sy, 2.8, 0, Math.PI * 2);
    radarCtx.fill();
  }

  if (!localPlayer.dead) {
    radarCtx.fillStyle = '#2ed573';
    radarCtx.beginPath();
    radarCtx.arc(localPlayer.x * sx, localPlayer.y * sy, 3.2, 0, Math.PI * 2);
    radarCtx.fill();
  }
}

function renderStartScreenSoldierPreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.save();
  previewCtx.translate(70, 82);
  previewCtx.scale(1.75, 1.75);
  const t = performance.now() * 0.004;
  renderSoldier(
    previewCtx,
    {
      x: 0,
      y: Math.sin(t) * 2.5,
      vx: 0,
      vy: 0,
      aimAngle: Math.sin(t * 0.7) * 0.2,
      health: 100,
      fuel: 100,
      activeWeaponId: WEAPON_IDS.M249,
      jetpackActive: true,
      grounded: false,
      spawnShield: 0,
      walkPhase: t
    },
    '',
    selectedColorId,
    true
  );
  previewCtx.restore();
}

// ==================== MAIN 60-144HZ GAME LOOP ====================

function mainLoop(nowMs) {
  let frameDt = (nowMs - lastFrameTimestamp) / 1000;
  lastFrameTimestamp = nowMs;
  if (frameDt > 0.1) frameDt = 0.1;

  fpsFrames++;
  if (nowMs - fpsLastTime >= 500) {
    currentFps = Math.round((fpsFrames * 1000) / (nowMs - fpsLastTime));
    fpsCounterEl.textContent = String(currentFps);
    fpsFrames = 0;
    fpsLastTime = nowMs;
  }

  clientSimAccum += frameDt;
  while (clientSimAccum >= TICK_DT) {
    stepClientPrediction(TICK_DT);
    clientSimAccum -= TICK_DT;
  }

  updateVisuals(frameDt, nowMs);
  renderScene();
  updateHUD(frameDt);

  requestAnimationFrame(mainLoop);
}

initStartScreen();
requestAnimationFrame(mainLoop);
