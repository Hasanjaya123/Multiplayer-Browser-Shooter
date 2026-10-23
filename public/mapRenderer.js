// Procedural Outpost Map Renderer & Offscreen Texture Baker
// Renders the expanded 4400x1650 Outpost world onto offscreen canvases

import { WORLD_WIDTH, WORLD_HEIGHT } from '/shared/constants.js';
import { COMPILED_MAP } from '/shared/map.js';

function createSeededRandom(seed = 1337) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class OutpostMapRenderer {
  constructor() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = WORLD_WIDTH;
    this.bgCanvas.height = WORLD_HEIGHT;

    this.fgCanvas = document.createElement('canvas');
    this.fgCanvas.width = WORLD_WIDTH;
    this.fgCanvas.height = WORLD_HEIGHT;

    this.baked = false;
  }

  bake() {
    if (this.baked) return;
    const rng = createSeededRandom(42069);

    const bgCtx = this.bgCanvas.getContext('2d');
    const fgCtx = this.fgCanvas.getContext('2d');

    this._bakeBackgroundLayer(bgCtx, rng);
    this._bakeForegroundLayer(fgCtx, rng);

    this.baked = true;
  }

  _tracePolygon(ctx, vertices) {
    if (!vertices || vertices.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
  }

  _bakeBackgroundLayer(ctx, rng) {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (const bgPoly of COMPILED_MAP.backgroundPolygons) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const v of bgPoly.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }

      if (bgPoly.type === 'dirt_bg') {
        ctx.save();
        this._tracePolygon(ctx, bgPoly.vertices);
        ctx.fillStyle = '#4c4436';
        ctx.fill();
        ctx.clip();

        const area = (maxX - minX) * (maxY - minY);
        const patchCount = Math.floor(area / 1500);
        for (let i = 0; i < patchCount; i++) {
          const px = minX + rng() * (maxX - minX);
          const py = minY + rng() * (maxY - minY);
          const r = 6 + rng() * 18;
          ctx.fillStyle = rng() < 0.5 ? '#3e372b' : '#574e3f';
          this._drawIrregularRock(ctx, px, py, r, rng, false);
        }

        const pebbleCount = Math.floor(area / 700);
        for (let i = 0; i < pebbleCount; i++) {
          const px = minX + rng() * (maxX - minX);
          const py = minY + rng() * (maxY - minY);
          const r = 2.5 + rng() * 5.5;
          ctx.fillStyle = rng() < 0.5 ? '#352f25' : '#635949';
          ctx.strokeStyle = '#242019';
          ctx.lineWidth = 1;
          this._drawIrregularRock(ctx, px, py, r, rng, true);
        }
        ctx.restore();

        // Dark stone border along exposed cave pillar edges
        ctx.save();
        const verts = bgPoly.vertices;
        for (let i = 0; i < verts.length; i++) {
          const a = verts[i];
          const b = verts[(i + 1) % verts.length];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const steps = Math.max(1, Math.floor(len / 14));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const rx = a.x + (b.x - a.x) * t + (rng() - 0.5) * 3;
            const ry = a.y + (b.y - a.y) * t + (rng() - 0.5) * 3;
            const rr = 4 + rng() * 4.5;
            ctx.fillStyle = rng() < 0.5 ? '#3d372e' : '#4f483d';
            ctx.strokeStyle = '#1b1814';
            ctx.lineWidth = 1.2;
            this._drawIrregularRock(ctx, rx, ry, rr, rng, true);
          }
        }
        ctx.restore();
      } else if (bgPoly.type === 'bunker_metal_bg') {
        ctx.save();
        this._tracePolygon(ctx, bgPoly.vertices);
        ctx.fillStyle = '#4c4e52';
        ctx.fill();
        ctx.strokeStyle = '#232528';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(minX, (minY + maxY) * 0.5);
        ctx.lineTo(maxX, (minY + maxY) * 0.5);
        ctx.stroke();

        if (bgPoly.windows) {
          for (const win of bgPoly.windows) {
            ctx.fillStyle = '#9ea2a8';
            ctx.fillRect(win.x - 4, win.y - 4, win.w + 8, win.h + 8);
            ctx.strokeStyle = '#25272a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(win.x - 4, win.y - 4, win.w + 8, win.h + 8);

            ctx.fillStyle = '#101215';
            ctx.fillRect(win.x, win.y, win.w, win.h);
          }
        }
        ctx.restore();
      } else if (bgPoly.type === 'bunker_wood_bg') {
        ctx.save();
        this._tracePolygon(ctx, bgPoly.vertices);
        ctx.fillStyle = '#534a3b';
        ctx.fill();

        ctx.strokeStyle = 'rgba(25, 20, 14, 0.35)';
        ctx.lineWidth = 1.5;
        for (let y = minY + 12; y < maxY; y += 16) {
          ctx.beginPath();
          ctx.moveTo(minX, y);
          ctx.lineTo(maxX, y);
          ctx.stroke();
        }

        if (bgPoly.windows) {
          for (const win of bgPoly.windows) {
            ctx.fillStyle = '#6e5d46';
            ctx.fillRect(win.x - 3, win.y - 3, win.w + 6, win.h + 6);
            ctx.fillStyle = '#0c0e10';
            ctx.fillRect(win.x, win.y, win.w, win.h);
            ctx.strokeStyle = '#1e1912';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(win.x, win.y, win.w, win.h);
          }
        }
        ctx.restore();
      }
    }
  }

  _bakeForegroundLayer(ctx, rng) {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 1. Render all Earth & Rock Islands
    for (const poly of COMPILED_MAP.polygons) {
      if (poly.material === 'earth' || poly.material === 'rock') {
        this._renderEarthPolygon(ctx, poly, rng);
      }
    }

    // 2. Render Decorative Wall Bushes
    for (const bush of COMPILED_MAP.bushes) {
      this._renderCliffBush(ctx, bush.x, bush.y, bush.scale || 1, rng);
    }

    // 3. Render All Metallic Bunkers (Left Bunker & East Pillbox)
    for (const poly of COMPILED_MAP.polygons) {
      if (poly.material === 'metal') {
        this._renderMetalBunkerPolygon(ctx, poly);
      }
    }

    // 4. Render All Wooden Log Bunkers (Right Log Bunker & Western Watchtower)
    this._renderAllWoodenBunkers(ctx, rng);

    // 5. Render Deadly Abyss Void Fog & Hazard Glow at the bottom of the world
    const abyssGrad = ctx.createLinearGradient(0, WORLD_HEIGHT - 120, 0, WORLD_HEIGHT);
    abyssGrad.addColorStop(0, 'rgba(20, 5, 8, 0)');
    abyssGrad.addColorStop(0.65, 'rgba(120, 18, 28, 0.28)');
    abyssGrad.addColorStop(1, 'rgba(220, 38, 52, 0.62)');
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, WORLD_HEIGHT - 120, WORLD_WIDTH, 120);
  }

  _renderEarthPolygon(ctx, poly, rng) {
    ctx.save();
    this._tracePolygon(ctx, poly.vertices);
    ctx.fillStyle = '#9e9588';
    ctx.fill();
    ctx.clip();

    const width = poly.maxX - poly.minX;
    const height = poly.maxY - poly.minY;
    const area = width * height;

    const patches = Math.floor(area / 2200);
    for (let i = 0; i < patches; i++) {
      const px = poly.minX + rng() * width;
      const py = poly.minY + rng() * height;
      const r = 10 + rng() * 24;
      ctx.fillStyle = rng() < 0.5 ? 'rgba(138, 129, 116, 0.35)' : 'rgba(172, 164, 152, 0.3)';
      this._drawIrregularRock(ctx, px, py, r, rng, false);
    }

    const rockCount = Math.floor(area / 950);
    for (let i = 0; i < rockCount; i++) {
      const rx = poly.minX + rng() * width;
      const ry = poly.minY + rng() * height;
      const rr = 2.5 + rng() * 8.5;
      const shade = rng();
      ctx.fillStyle = shade < 0.35 ? '#877f73' : (shade < 0.75 ? '#b3aba0' : '#736c61');
      ctx.strokeStyle = '#332f2a';
      ctx.lineWidth = 1.1;
      this._drawIrregularRock(ctx, rx, ry, rr, rng, true);
    }
    ctx.restore();

    // Rocky Border Stones along non-grass edges
    ctx.save();
    for (const edge of poly.edges) {
      if (edge.isGrassEdge) continue;

      const steps = Math.max(1, Math.floor(edge.len / 11));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const bx = edge.ax + edge.dx * t + (rng() - 0.5) * 2.5;
        const by = edge.ay + edge.dy * t + (rng() - 0.5) * 2.5;
        const br = 5.5 + rng() * 5.5;
        const cPick = rng();
        ctx.fillStyle = cPick < 0.33 ? '#8c867e' : (cPick < 0.68 ? '#a8a29a' : '#736e67');
        ctx.strokeStyle = '#1c1a17';
        ctx.lineWidth = 1.4;
        this._drawIrregularRock(ctx, bx, by, br, rng, true);
      }
    }
    ctx.restore();

    // Lush Green Grass Blades & Tufts along walkable top edges
    ctx.save();
    for (const edge of poly.edges) {
      if (!edge.isGrassEdge) continue;

      if (edge.len > 70 && rng() < 0.55) {
        const st = 0.2 + rng() * 0.6;
        const sx = edge.ax + edge.dx * st;
        const sy = edge.ay + edge.dy * st;
        ctx.fillStyle = '#aba59c';
        ctx.strokeStyle = '#22201d';
        ctx.lineWidth = 1.4;
        this._drawIrregularRock(ctx, sx, sy - 4, 6 + rng() * 4, rng, true);
      }

      const bladeSpacing = 5.5;
      const bladeCount = Math.max(2, Math.floor(edge.len / bladeSpacing));

      ctx.beginPath();
      ctx.moveTo(edge.ax, edge.ay + 4);
      for (let i = 0; i <= bladeCount; i++) {
        const t = i / bladeCount;
        const gx = edge.ax + edge.dx * t;
        const gy = edge.ay + edge.dy * t;
        const h = 7 + (i % 3 === 0 ? 5 : 2) + rng() * 4;
        const lean = (rng() - 0.5) * 4;
        ctx.lineTo(gx + lean, gy - h);
        ctx.lineTo(gx + bladeSpacing * 0.5, gy + 1);
      }
      ctx.lineTo(edge.bx, edge.by + 5);
      ctx.closePath();
      ctx.fillStyle = '#5eb548';
      ctx.fill();
      ctx.strokeStyle = '#1e3618';
      ctx.lineWidth = 1.35;
      ctx.stroke();

      ctx.fillStyle = '#7ad162';
      for (let i = 0; i <= bladeCount; i += 2) {
        const t = i / bladeCount;
        const gx = edge.ax + edge.dx * t;
        const gy = edge.ay + edge.dy * t;
        ctx.beginPath();
        ctx.moveTo(gx - 2.5, gy + 3);
        ctx.lineTo(gx + (rng() - 0.5) * 3, gy - 6 - rng() * 4);
        ctx.lineTo(gx + 2.5, gy + 3);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _renderMetalBunkerPolygon(ctx, poly) {
    ctx.save();
    this._tracePolygon(ctx, poly.vertices);

    const grad = ctx.createLinearGradient(poly.minX, poly.minY, poly.maxX, poly.maxY);
    grad.addColorStop(0, '#96999e');
    grad.addColorStop(0.5, '#82858a');
    grad.addColorStop(1, '#73767b');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#1e2022';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.clip();
    ctx.strokeStyle = '#c8ccd0';
    ctx.lineWidth = 5;
    this._tracePolygon(ctx, poly.vertices);
    ctx.stroke();

    ctx.strokeStyle = '#2d3033';
    ctx.lineWidth = 1.5;
    this._tracePolygon(ctx, poly.vertices);
    ctx.stroke();
    ctx.restore();
  }

  _renderAllWoodenBunkers(ctx, rng) {
    // Diagonal braces inside Right Wooden Bunker (shifted by OX=480, OY=150)
    const OX = 480;
    const OY = 150;
    ctx.save();
    this._drawWoodenLogBeam(ctx, 2735 + OX, 555 + OY, 2825 + OX, 608 + OY, 16, rng);
    this._drawWoodenLogBeam(ctx, 2990 + OX, 555 + OY, 2900 + OX, 608 + OY, 16, rng);
    this._drawWoodenLogBeam(ctx, 2740 + OX, 505 + OY, 2810 + OX, 465 + OY, 14, rng);
    this._drawWoodenLogBeam(ctx, 2985 + OX, 505 + OY, 2915 + OX, 465 + OY, 14, rng);

    // Diagonal braces inside Western Watchtower
    this._drawWoodenLogBeam(ctx, 140, 530, 210, 490, 14, rng);
    this._drawWoodenLogBeam(ctx, 140, 590, 210, 640, 15, rng);
    ctx.restore();

    for (const poly of COMPILED_MAP.polygons) {
      if (poly.material !== 'wood') continue;

      ctx.save();
      this._tracePolygon(ctx, poly.vertices);
      ctx.fillStyle = '#78664e';
      ctx.fill();
      ctx.clip();

      for (let y = poly.minY; y <= poly.maxY + 6; y += 13) {
        this._drawWoodenLogBeam(ctx, poly.minX - 4, y, poly.maxX + 4, y, 13, rng);
      }
      ctx.restore();

      ctx.save();
      this._tracePolygon(ctx, poly.vertices);
      ctx.strokeStyle = '#1f1912';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      // Draw circular timber log-end cross-sections along vertical edges of the wood structure
      for (let y = poly.minY + 9; y <= poly.maxY - 6; y += 18) {
        this._drawLogCrossSection(ctx, poly.minX + 8, y, 8.2);
        this._drawLogCrossSection(ctx, poly.maxX - 8, y, 8.2);
      }
    }
  }

  _drawWoodenLogBeam(ctx, x1, y1, x2, y2, thickness, rng) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    ctx.fillStyle = rng() < 0.5 ? '#7c6a50' : '#6e5c44';
    ctx.fillRect(0, -thickness / 2, len, thickness);
    ctx.strokeStyle = '#241d15';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(0, -thickness / 2, len, thickness);

    ctx.strokeStyle = 'rgba(35, 26, 16, 0.45)';
    ctx.lineWidth = 1;
    for (let gx = 8; gx < len - 8; gx += 22) {
      ctx.beginPath();
      ctx.moveTo(gx, -thickness * 0.25);
      ctx.lineTo(gx + 14, -thickness * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawLogCrossSection(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#bfa882';
    ctx.fill();
    ctx.strokeStyle = '#241d14';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = '#756145';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#5c4b33';
    ctx.fill();
    ctx.restore();
  }

  _renderCliffBush(ctx, x, y, scale, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const leafAngles = [-0.7, -0.35, 0, 0.35, 0.7];
    for (const a of leafAngles) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6, -12, 0, -22);
      ctx.quadraticCurveTo(6, -12, 0, 0);
      ctx.fillStyle = '#5eb04a';
      ctx.fill();
      ctx.strokeStyle = '#1e3618';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }

    const stones = [
      { dx: -10, dy: 2, r: 5.5 },
      { dx: -4, dy: 5, r: 6 },
      { dx: 4, dy: 5, r: 6 },
      { dx: 10, dy: 2, r: 5.5 },
      { dx: 0, dy: 8, r: 5 }
    ];
    for (const s of stones) {
      ctx.fillStyle = '#8b857c';
      ctx.strokeStyle = '#1f1d1a';
      ctx.lineWidth = 1.3;
      this._drawIrregularRock(ctx, s.dx, s.dy, s.r, rng, true);
    }

    ctx.restore();
  }

  _drawIrregularRock(ctx, cx, cy, radius, rng, stroke = true) {
    const sides = 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const rad = radius * (0.72 + rng() * 0.45);
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad * 0.88;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  }
}
