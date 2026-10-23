// Realistic Multi-Layered Acoustic Firearm & Explosion Synthesizer (Web Audio API)
// Models: Supersonic Ballistic Crack, Muzzle Blast Transient, Powder Combustion Body,
// Mechanical Bolt/Pump Action, Soft-Clip Saturation, and Stereo Canyon Impulse Reverb

import { WEAPON_IDS } from '/shared/weapons.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterVolume = 0.85;
    this.sfxVolume = 1.0;
    this.jetpackVolume = 0.8;
    this.whiteBuffer = null;
    this.brownBuffer = null;
    this.masterCompressor = null;
    this.masterGain = null;
    this.saturator = null;
    this.reverbConvolver = null;
    this.reverbGain = null;
    this.jetpackGain = null;
    this.rocketLoops = new Map();
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    const sr = this.ctx.sampleRate;

    // 1. White Noise Buffer (for crisp transients & supersonic cracks)
    const len = Math.floor(sr * 2.0);
    this.whiteBuffer = this.ctx.createBuffer(1, len, sr);
    const wData = this.whiteBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      wData[i] = Math.random() * 2 - 1;
    }

    // 2. Pink/Brown Weighted Noise Buffer (for heavy powder combustion & explosions)
    this.brownBuffer = this.ctx.createBuffer(1, len, sr);
    const bData = this.brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.045 * white) / 1.045;
      bData[i] = lastOut * 2.8;
    }

    // 3. Master Acoustic Chain: Soft-Clipped WaveShaper -> Dynamics Compressor -> Master Gain -> Destination
    this.saturator = this.ctx.createWaveShaper();
    this.saturator.curve = this._makeSoftClipCurve(400);
    this.saturator.oversample = '2x';

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -10;
    this.masterCompressor.knee.value = 12;
    this.masterCompressor.ratio.value = 6;
    this.masterCompressor.attack.value = 0.001;
    this.masterCompressor.release.value = 0.14;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;

    this.saturator.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // 4. Stereo Outdoor Canyon & Bunker Impulse Response Reverb
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this._createCanyonImpulse(sr, 0.85);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.34;
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterCompressor);
  }

  _makeSoftClipCurve(amount = 400) {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * (1 + amount / 200));
    }
    return curve;
  }

  _createCanyonImpulse(sr, durationSec) {
    const length = Math.floor(sr * durationSec);
    const impulse = this.ctx.createBuffer(2, length, sr);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const earlyEchoMs = [18, 37, 68, 115, 175];
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const env = Math.pow(1 - t / durationSec, 2.6) * 0.42;
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    for (const ms of earlyEchoMs) {
      const idx = Math.floor((ms / 1000) * sr);
      const spread = Math.floor(0.006 * sr);
      for (let j = 0; j < spread && idx + j < length; j++) {
        const w = (1 - j / spread) * 0.55 * (1 - ms / 240);
        left[idx + j] += (Math.random() * 2 - 1) * w;
        right[idx + j] += (Math.random() * 2 - 1) * w;
      }
    }
    return impulse;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1.5, Number(val) || 0));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1.5, Number(val) || 0));
  }

  setJetpackVolume(val) {
    this.jetpackVolume = Math.max(0, Math.min(1.5, Number(val) || 0));
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  getVolumeForDistance(x, y, listenerX, listenerY, maxDist = 2000) {
    if (this.muted || !this.ctx || this.masterVolume <= 0.001 || this.sfxVolume <= 0.001) return 0;
    if (listenerX === undefined || listenerY === undefined) return this.sfxVolume;
    const d = Math.hypot(x - listenerX, y - listenerY);
    if (d >= maxDist) return 0;
    const atten = 1 - d / maxDist;
    return Math.max(0.05, Math.pow(atten, 1.55)) * this.sfxVolume;
  }

  playGunshot(weaponId, x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 2100);
    if (vol <= 0.01 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);
    const vPitch = 0.96 + Math.random() * 0.08;

    if (weaponId === WEAPON_IDS.RPG) {
      this.playRPGLaunch(x, y, lx, ly);
      return;
    }

    if (weaponId === WEAPON_IDS.FLAMETHROWER) {
      this.playFlamethrowerBurst(x, y, lx, ly);
      return;
    }

    if (weaponId === WEAPON_IDS.M249) {
      // ==================== M249 SAW (5.56mm Belt-Fed LMG) ====================
      // 1. Supersonic N-wave ballistic crack
      this._layerNoise(now, this.whiteBuffer, 0.014, 2500 * vPitch, 'highpass', 1.1, vol * 0.56, 0.16, pan);
      this._layerPunch(now, 2100 * vPitch, 340, 0.012, vol * 0.34, pan, 'sine');
      // 2. Heavy open-bolt chamber punch & gas expansion roar
      this._layerNoise(now, this.brownBuffer, 0.098, 590 * vPitch, 'lowpass', 1.45, vol * 0.88, 0.36, pan);
      this._layerNoise(now, this.whiteBuffer, 0.058, 1180 * vPitch, 'bandpass', 1.2, vol * 0.56, 0.24, pan);
      // 3. Chest-thumping sub-transient
      this._layerPunch(now, 160 * vPitch, 36, 0.072, vol * 0.72, pan, 'triangle');
      // 4. Metallic disintegrating belt-link & heavy bolt carrier clatter
      this._layerMetallicClick(now + 0.016, 3650 * vPitch, 0.018, vol * 0.30, pan);
      this._layerMetallicClick(now + 0.034, 2350 * vPitch, 0.016, vol * 0.22, pan);

    } else if (weaponId === WEAPON_IDS.SNIPER) {
      // ==================== AWP SNIPER (.338 Lapua Magnum) ====================
      // 1. Blinding supersonic N-wave whip-crack
      this._layerNoise(now, this.whiteBuffer, 0.024, 2900 * vPitch, 'highpass', 1.25, vol * 0.90, 0.48, pan);
      this._layerPunch(now, 2550 * vPitch, 310, 0.018, vol * 0.60, pan, 'sine');
      // 2. Massive high-pressure powder cannon boom + long canyon reverb
      this._layerNoise(now, this.brownBuffer, 0.36, 440 * vPitch, 'lowpass', 1.65, vol * 1.20, 0.72, pan);
      this._layerNoise(now + 0.005, this.whiteBuffer, 0.19, 960 * vPitch, 'bandpass', 0.95, vol * 0.78, 0.58, pan);
      // 3. Deep sub-bass chest concussion
      this._layerPunch(now, 115 * vPitch, 22, 0.25, vol * 1.0, pan, 'triangle');
      // 4. Crisp bolt-action rifle cycle (chk-clack after shot)
      this._layerMetallicClick(now + 0.36, 2950, 0.028, vol * 0.34, pan);
      this._layerMetallicClick(now + 0.48, 2150, 0.032, vol * 0.38, pan);

    } else if (weaponId === WEAPON_IDS.SHOTGUN) {
      // ==================== SPAS-12 (12-Gauge Buckshot) ====================
      // 1. Explosive wide-bore muzzle blast
      this._layerNoise(now, this.whiteBuffer, 0.022, 1950 * vPitch, 'highpass', 0.95, vol * 0.70, 0.32, pan);
      this._layerNoise(now, this.brownBuffer, 0.23, 490 * vPitch, 'lowpass', 1.55, vol * 1.10, 0.52, pan);
      this._layerNoise(now, this.whiteBuffer, 0.14, 890 * vPitch, 'bandpass', 0.85, vol * 0.75, 0.42, pan);
      // 2. Heavy 12-gauge chest punch
      this._layerPunch(now, 130 * vPitch, 28, 0.16, vol * 0.92, pan, 'triangle');
      // 3. Pump-action slide rack (ch-chk)
      this._layerMetallicClick(now + 0.22, 1850, 0.038, vol * 0.36, pan);
      this._layerMetallicClick(now + 0.31, 2480, 0.035, vol * 0.40, pan);

    } else {
      // ==================== M4A1 CARBINE (5.56x45mm NATO) ====================
      // 1. Crisp 5.56mm supersonic N-wave snap
      this._layerNoise(now, this.whiteBuffer, 0.013, 2700 * vPitch, 'highpass', 1.15, vol * 0.62, 0.20, pan);
      this._layerPunch(now, 2150 * vPitch, 360, 0.011, vol * 0.38, pan, 'sine');
      // 2. Tight rifle chamber blast & barrel resonance
      this._layerNoise(now, this.brownBuffer, 0.082, 690 * vPitch, 'lowpass', 1.35, vol * 0.82, 0.34, pan);
      this._layerNoise(now, this.whiteBuffer, 0.050, 1400 * vPitch, 'bandpass', 1.15, vol * 0.54, 0.22, pan);
      // 3. Punchy low-mid powder body transient
      this._layerPunch(now, 180 * vPitch, 44, 0.058, vol * 0.68, pan, 'triangle');
      // 4. Buffer spring & bolt carrier snap
      this._layerMetallicClick(now + 0.016, 3350 * vPitch, 0.016, vol * 0.30, pan);
    }
  }

  // ==================== FORTNITE RPG LAUNCH, IN-FLIGHT LOOP & EXPLOSION ====================

  playRPGLaunch(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 2500);
    if (vol <= 0.01 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);

    // 1. Hollow Launch Tube Thump (Venturi Backblast: 135Hz -> 32Hz)
    this._layerPunch(now, 135, 32, 0.24, vol * 0.95, pan, 'triangle');
    this._layerNoise(now, this.brownBuffer, 0.18, 210, 'bandpass', 3.2, vol * 0.82, 0.35, pan);

    // 2. Metallic Ignition Latch / Striker Clack
    this._layerMetallicClick(now, 1850, 0.022, vol * 0.45, pan);
    this._layerMetallicClick(now + 0.008, 3400, 0.035, vol * 0.38, pan);
    this._layerPunch(now, 920, 480, 0.025, vol * 0.28, pan, 'triangle');

    // 3. Fortnite Signature Rocket Motor Propellant Whoosh & Whistle
    this._layerRocketWhoosh(now, 0.62, vol * 0.88, pan);

    // Aerodynamic fin/nozzle whistle scream (1450Hz -> 2350Hz -> 1180Hz)
    const whistleOsc = this.ctx.createOscillator();
    whistleOsc.type = 'sawtooth';
    whistleOsc.frequency.setValueAtTime(1450, now);
    whistleOsc.frequency.exponentialRampToValueAtTime(2350, now + 0.12);
    whistleOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.56);

    const whistleFilter = this.ctx.createBiquadFilter();
    whistleFilter.type = 'bandpass';
    whistleFilter.frequency.setValueAtTime(1900, now);
    whistleFilter.Q.value = 6.5;

    const whistleGain = this.ctx.createGain();
    whistleGain.gain.setValueAtTime(0.001, now);
    whistleGain.gain.linearRampToValueAtTime(vol * 0.18, now + 0.03);
    whistleGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.56);

    whistleOsc.connect(whistleFilter);
    whistleFilter.connect(whistleGain);
    this._routeNode(whistleGain, pan, this.saturator, 0.32);

    whistleOsc.start(now);
    whistleOsc.stop(now + 0.57);
  }

  updateRocketLoop(projId, x, y, vx, vy, lx, ly) {
    if (!this.ctx || this.muted || this.masterVolume <= 0.001 || this.sfxVolume <= 0.001) return;
    if (projId === undefined || projId === null) return;

    const vol = this.getVolumeForDistance(x, y, lx, ly, 2100);
    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);

    let loop = this.rocketLoops.get(projId);
    if (!loop) {
      if (vol <= 0.01) return;

      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = this.whiteBuffer;
      noiseSrc.loop = true;

      const bpFilter = this.ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.value = 1150;
      bpFilter.Q.value = 2.0;

      const whineOsc = this.ctx.createOscillator();
      whineOsc.type = 'sawtooth';
      whineOsc.frequency.value = 1520;

      const whineFilter = this.ctx.createBiquadFilter();
      whineFilter.type = 'bandpass';
      whineFilter.frequency.value = 1550;
      whineFilter.Q.value = 6.0;

      const whineGain = this.ctx.createGain();
      whineGain.gain.value = 0.12;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.001;

      let panner = null;
      if (this.ctx.createStereoPanner) {
        try {
          panner = this.ctx.createStereoPanner();
          panner.pan.value = pan;
        } catch (_) {
          panner = null;
        }
      }

      noiseSrc.connect(bpFilter);
      bpFilter.connect(gain);

      whineOsc.connect(whineFilter);
      whineFilter.connect(whineGain);
      whineGain.connect(gain);

      if (panner) {
        gain.connect(panner);
        panner.connect(this.masterCompressor);
      } else {
        gain.connect(this.masterCompressor);
      }

      noiseSrc.start(now, Math.random() * 1.0);
      whineOsc.start(now);

      loop = { noiseSrc, whineOsc, bpFilter, whineFilter, gain, panner };
      this.rocketLoops.set(projId, loop);
    }

    // Doppler shift based on radial velocity toward listener
    const dx = (lx ?? x) - x;
    const dy = (ly ?? y) - y;
    const dist = Math.hypot(dx, dy) || 1;
    const radialVel = (vx * (dx / dist) + vy * (dy / dist));
    const doppler = Math.max(0.75, Math.min(1.35, 1 + radialVel / 1400));

    loop.bpFilter.frequency.setTargetAtTime(1150 * doppler, now, 0.03);
    loop.whineOsc.frequency.setTargetAtTime(1520 * doppler, now, 0.03);
    loop.gain.gain.setTargetAtTime(vol * 0.24, now, 0.03);
    if (loop.panner) {
      loop.panner.pan.setTargetAtTime(pan, now, 0.03);
    }
  }

  stopRocketLoop(projId) {
    const loop = this.rocketLoops.get(projId);
    if (!loop) return;
    this.rocketLoops.delete(projId);
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      loop.gain.gain.setTargetAtTime(0.0001, now, 0.02);
      loop.noiseSrc.stop(now + 0.05);
      loop.whineOsc.stop(now + 0.05);
    } catch (_) {}
  }

  stopAllRocketLoops() {
    for (const projId of Array.from(this.rocketLoops.keys())) {
      this.stopRocketLoop(projId);
    }
  }

  // ==================== FLAMETHROWER, TOXIC GAS & PROXY MINE AUDIO ====================

  playFlamethrowerBurst(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 1600);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);
    const vPitch = 0.92 + Math.random() * 0.16;

    // 1. Turbulent liquid-fuel fire roar (lowpass brown noise)
    this._layerNoise(now, this.brownBuffer, 0.14, 340 * vPitch, 'lowpass', 1.5, vol * 0.52, 0.18, pan);
    // 2. High-pressure atomized propellant nozzle jet hiss
    this._layerNoise(now, this.whiteBuffer, 0.11, 1350 * vPitch, 'bandpass', 1.1, vol * 0.28, 0.12, pan);
    // 3. Subtle sub-puff whoosh
    this._layerPunch(now, 88 * vPitch, 34, 0.09, vol * 0.24, pan, 'sine');
  }

  playGasCloudRelease(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 2200);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);

    // Canister pop + long pressurized M7 toxic gas hiss
    this._layerPunch(now, 190, 52, 0.16, vol * 0.65, pan, 'triangle');
    this._layerMetallicClick(now, 2400, 0.03, vol * 0.45, pan);
    this._layerNoise(now + 0.02, this.whiteBuffer, 0.95, 1650, 'bandpass', 1.4, vol * 0.62, 0.45, pan);
    this._layerNoise(now + 0.05, this.brownBuffer, 0.85, 420, 'lowpass', 1.2, vol * 0.48, 0.35, pan);
  }

  playMineTrigger(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 1800);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);

    // Classic Mini Militia proximity mine high-pitched electronic warning chirp before blast
    this._layerPunch(now, 2600, 3100, 0.045, vol * 0.55, pan, 'sine');
    this._layerPunch(now + 0.05, 3200, 3600, 0.045, vol * 0.65, pan, 'sine');
  }

  playExplosion(x, y, lx, ly, isRpg = false) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 2800);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);
    const boost = isRpg ? 1.15 : 1.0;

    // 1. Detonation shockwave snap (0-25ms)
    this._layerNoise(now, this.whiteBuffer, 0.028, 2200, 'highpass', 1.2, vol * 0.85 * boost, 0.5, pan);
    this._layerPunch(now, 1600, 120, 0.022, vol * 0.55 * boost, pan, 'sine');
    // 2. Sub-bass chest concussion (115Hz -> 20Hz over 0.68s)
    this._layerPunch(now, 115, 20, 0.68, vol * 1.32 * boost, pan, 'triangle');
    // 3. Fireball roar & mid-bass crackle
    this._layerNoise(now, this.brownBuffer, 0.92, 460, 'lowpass', 1.6, vol * 1.30 * boost, 0.82, pan);
    this._layerNoise(now + 0.025, this.whiteBuffer, 0.60, 760, 'bandpass', 1.1, vol * 0.72 * boost, 0.65, pan);
    // 4. Secondary delayed canyon echo rumble
    this._layerNoise(now + 0.085, this.brownBuffer, 0.95, 210, 'lowpass', 1.2, vol * 0.65 * boost, 0.75, pan);
  }

  // ==================== MINI MILITIA CLASSIC DEATH CRY ("AAAAH!") ====================

  playDeathCry(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 2200);
    if (vol <= 0.01 || !this.ctx) return;

    const now = this.ctx.currentTime;
    const pan = this._getPan(x, lx);
    const pitchVar = 0.94 + Math.random() * 0.12;
    const duration = 0.56;

    // 1. Glottal Vocal Cord Source (Sawtooth + Triangle blend with vibrato)
    const sawOsc = this.ctx.createOscillator();
    const triOsc = this.ctx.createOscillator();
    sawOsc.type = 'sawtooth';
    triOsc.type = 'triangle';

    // Classic Mini Militia "Aaaagh!" pitch contour: 240Hz -> 280Hz peak -> 128Hz slide down
    const f0Start = 240 * pitchVar;
    const f0Peak = 282 * pitchVar;
    const f0End = 128 * pitchVar;

    for (const osc of [sawOsc, triOsc]) {
      osc.frequency.setValueAtTime(f0Start, now);
      osc.frequency.linearRampToValueAtTime(f0Peak, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(f0End, now + duration);
    }

    // Subtle vocal pain vibrato (6.5 Hz)
    const vibOsc = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibOsc.frequency.value = 6.5;
    vibGain.gain.value = 9.0;
    vibOsc.connect(vibGain);
    vibGain.connect(sawOsc.frequency);
    vibGain.connect(triOsc.frequency);

    const vocalMix = this.ctx.createGain();
    vocalMix.gain.value = 0.75;
    sawOsc.connect(vocalMix);
    triOsc.connect(vocalMix);

    // 2. Parallel Vocal Tract Formant Filters (F1 "Ah", F2, F3)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(820 * pitchVar, now);
    f1.frequency.exponentialRampToValueAtTime(540 * pitchVar, now + duration);
    f1.Q.value = 4.2;

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1360 * pitchVar, now);
    f2.frequency.exponentialRampToValueAtTime(980 * pitchVar, now + duration);
    f2.Q.value = 5.0;

    const f3 = this.ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.setValueAtTime(2650 * pitchVar, now);
    f3.frequency.exponentialRampToValueAtTime(2250 * pitchVar, now + duration);
    f3.Q.value = 6.5;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(0.001, now);
    envGain.gain.linearRampToValueAtTime(vol * 0.72, now + 0.018);
    envGain.gain.setValueAtTime(vol * 0.68, now + 0.24);
    envGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    vocalMix.connect(f1);
    vocalMix.connect(f2);
    vocalMix.connect(f3);
    f1.connect(envGain);
    f2.connect(envGain);
    f3.connect(envGain);

    this._routeNode(envGain, pan, this.saturator, 0.32);

    sawOsc.start(now);
    triOsc.start(now);
    vibOsc.start(now);
    sawOsc.stop(now + duration + 0.02);
    triOsc.stop(now + duration + 0.02);
    vibOsc.stop(now + duration + 0.02);

    // 3. Vocal rasp/breath grit + Ragdoll body/helmet thud
    this._layerNoise(now, this.whiteBuffer, 0.18, 1450 * pitchVar, 'bandpass', 2.2, vol * 0.18, 0.15, pan);
    this._layerPunch(now + 0.05, 118, 34, 0.12, vol * 0.55, pan, 'triangle');
    this._layerMetallicClick(now + 0.26, 1450, 0.035, vol * 0.25, pan);
  }

  playMelee(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 1100);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._layerNoise(now, this.whiteBuffer, 0.095, 1900, 'bandpass', 1.8, vol * 0.42, 0.05);
    this._layerPunch(now, 380, 110, 0.085, vol * 0.32);
  }

  playHitmarker(isHeadshot = false) {
    this.init();
    if (this.muted || !this.ctx || this.sfxVolume <= 0.001) return;
    const now = this.ctx.currentTime;
    const v = 0.35 * this.sfxVolume;
    this._layerMetallicClick(now, isHeadshot ? 2600 : 1750, 0.025, v);
    if (isHeadshot) {
      this._layerMetallicClick(now + 0.025, 3400, 0.03, v);
    }
  }

  playReload() {
    this.init();
    if (this.muted || !this.ctx || this.sfxVolume <= 0.001) return;
    const now = this.ctx.currentTime;
    const s = this.sfxVolume;
    this._layerMetallicClick(now, 1950, 0.028, 0.28 * s);
    this._layerMetallicClick(now + 0.14, 1450, 0.035, 0.32 * s);
    this._layerMetallicClick(now + 0.28, 2650, 0.025, 0.28 * s);
  }

  playPickup() {
    this.init();
    if (this.muted || !this.ctx || this.sfxVolume <= 0.001) return;
    const now = this.ctx.currentTime;
    const s = this.sfxVolume;
    this._layerMetallicClick(now, 1800, 0.03, 0.32 * s);
    this._layerMetallicClick(now + 0.075, 2550, 0.035, 0.36 * s);
  }

  playKillChime() {
    this.init();
    if (this.muted || !this.ctx || this.sfxVolume <= 0.001) return;
    const now = this.ctx.currentTime;
    this._layerMetallicClick(now, 2200, 0.04, 0.3 * this.sfxVolume);
  }

  playGrenadeThrow(x, y, lx, ly) {
    this.init();
    const vol = this.getVolumeForDistance(x, y, lx, ly, 1200);
    if (vol <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._layerMetallicClick(now, 3800, 0.035, vol * 0.32);
    this._layerMetallicClick(now + 0.04, 4600, 0.025, vol * 0.25);
  }

  setJetpackThrust(active) {
    if (!this.ctx || this.muted || this.masterVolume <= 0.001 || this.jetpackVolume <= 0.001) {
      if (this.jetpackGain && this.ctx) {
        this.jetpackGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
      return;
    }

    if (!this.jetpackGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.brownBuffer;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 285;
      filter.Q.value = 1.2;

      this.jetpackGain = this.ctx.createGain();
      this.jetpackGain.gain.value = 0;

      src.connect(filter);
      filter.connect(this.jetpackGain);
      this.jetpackGain.connect(this.masterCompressor);
      src.start();
    }

    const target = active ? (0.15 * this.jetpackVolume) : 0;
    this.jetpackGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  // ==================== INTERNAL ACOUSTIC SYNTHESIS PRIMITIVES ====================

  _getPan(sourceX, listenerX, maxPanDist = 850) {
    if (sourceX === undefined || listenerX === undefined) return 0;
    return Math.max(-1.0, Math.min(1.0, (sourceX - listenerX) / maxPanDist));
  }

  _routeNode(sourceNode, panVal, destNode, reverbSend = 0) {
    if (!this.ctx || !sourceNode) return;
    const target = destNode || this.masterCompressor;
    if (panVal !== 0 && this.ctx.createStereoPanner) {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1.0, Math.min(1.0, panVal)), this.ctx.currentTime);
        sourceNode.connect(panner);
        panner.connect(target);
      } catch (_) {
        sourceNode.connect(target);
      }
    } else {
      sourceNode.connect(target);
    }

    if (reverbSend > 0 && this.reverbConvolver) {
      try {
        const revSendGain = this.ctx.createGain();
        revSendGain.gain.value = reverbSend;
        sourceNode.connect(revSendGain);
        revSendGain.connect(this.reverbConvolver);
      } catch (_) {}
    }
  }

  _layerNoise(startTime, buffer, duration, cutoffFreq, filterType, qVal, gainVal, reverbSend = 0, panVal = 0) {
    if (!this.ctx || !buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const maxOffset = Math.max(0, buffer.duration - duration - 0.05);
    const offset = Math.random() * maxOffset;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoffFreq, startTime);
    filter.Q.setValueAtTime(qVal, startTime);
    if (filterType === 'lowpass' || filterType === 'bandpass') {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoffFreq * 0.28), startTime + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    this._routeNode(gain, panVal, this.saturator, reverbSend);

    src.start(startTime, offset, duration + 0.02);
    src.stop(startTime + duration + 0.02);
  }

  _layerPunch(startTime, startFreq, endFreq, duration, gainVal, panVal = 0, oscType = 'sine') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(16, endFreq), startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    this._routeNode(gain, panVal, this.saturator, 0);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  _layerMetallicClick(startTime, centerFreq, duration, gainVal, panVal = 0) {
    if (!this.ctx || !this.whiteBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    const offset = Math.random() * 1.2;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(5.5, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    this._routeNode(gain, panVal, this.masterCompressor, 0);

    src.start(startTime, offset, duration + 0.01);
    src.stop(startTime + duration + 0.01);
  }

  _layerRocketWhoosh(startTime, duration, gainVal, panVal = 0) {
    if (!this.ctx || !this.whiteBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(420, startTime);
    filter.frequency.exponentialRampToValueAtTime(1650, startTime + duration * 0.25);
    filter.frequency.exponentialRampToValueAtTime(360, startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    this._routeNode(gain, panVal, this.saturator, 0.42);

    src.start(startTime, 0, duration + 0.02);
    src.stop(startTime + duration + 0.02);
  }
}

export const soundFX = new SoundEngine();

