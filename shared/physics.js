// Deterministic 60Hz Shared Physics, Slope Collision, Jetpack & Raycast Engine
// Runs identically on Node.js Authoritative Server and Browser Client Prediction

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_HIT_RADIUS,
  GRAVITY,
  MOVE_ACCEL_GROUND,
  MOVE_ACCEL_AIR,
  MAX_WALK_SPEED,
  MAX_AIR_SPEED_X,
  GROUND_FRICTION,
  AIR_DRAG_X,
  AIR_DRAG_Y,
  JETPACK_ACCEL,
  JETPACK_COUNTER_FALL_BONUS,
  MAX_JETPACK_UP_SPEED,
  MAX_FALL_SPEED,
  JETPACK_FUEL_MAX,
  JETPACK_BURN_RATE,
  JETPACK_REGEN_GROUND,
  JETPACK_REGEN_AIR,
  JETPACK_COOLDOWN_DELAY,
  GRENADE_RADIUS,
  GRENADE_RESTITUTION,
  GRENADE_FRICTION
} from './constants.js';
import { COMPILED_MAP } from './map.js';
import { getWeapon } from './weapons.js';

export function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y;
    const xj = verts[j].x, yj = verts[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-7) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Closest point on segment AB to point P
export function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-8) return { x: ax, y: ay, t: 0 };
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return {
    x: ax + t * abx,
    y: ay + t * aby,
    t
  };
}

// Segment-segment intersection for raycasting
export function segmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-8) return null;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
      t: ua
    };
  }
  return null;
}

// Raycast against all map polygons (returns earliest intersection)
export function raycastMap(x1, y1, x2, y2, map = COMPILED_MAP) {
  const minX = Math.min(x1, x2) - 2;
  const minY = Math.min(y1, y2) - 2;
  const maxX = Math.max(x1, x2) + 2;
  const maxY = Math.max(y1, y2) + 2;

  let bestT = 1.000001;
  let bestHit = null;

  const edges = map.allEdges;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.maxX < minX || e.minX > maxX || e.maxY < minY || e.minY > maxY) {
      continue;
    }
    const hit = segmentIntersection(x1, y1, x2, y2, e.ax, e.ay, e.bx, e.by);
    if (hit && hit.t < bestT) {
      bestT = hit.t;
      bestHit = {
        hit: true,
        x: hit.x,
        y: hit.y,
        t: hit.t,
        nx: e.nx,
        ny: e.ny,
        material: e.material,
        polyId: e.polyId
      };
    }
  }

  if (bestHit) return bestHit;
  return { hit: false, x: x2, y: y2, t: 1.0 };
}

// Swept segment vs player hit circles
export function raycastPlayers(x1, y1, x2, y2, playersList, ignoreId, maxT = 1.0) {
  let bestT = maxT;
  let bestResult = null;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq < 1e-6) return null;

  for (let i = 0; i < playersList.length; i++) {
    const p = playersList[i];
    if (!p || p.dead || p.id === ignoreId) continue;

    const isCrouched = !!p.crouched;
    const cx = p.x;
    const cy = isCrouched ? (p.y + 4) : (p.y - 2);
    const r = isCrouched ? (PLAYER_HIT_RADIUS * 0.78) : PLAYER_HIT_RADIUS;

    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = segLenSq;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) continue;

    discriminant = Math.sqrt(discriminant);
    let t = (-b - discriminant) / (2 * a);
    if (t < 0) {
      // Started inside circle?
      if (c <= 0) t = 0;
      else continue;
    }

    if (t >= 0 && t <= bestT) {
      const hitX = x1 + t * dx;
      const hitY = y1 + t * dy;
      const isHeadshot = hitY < (isCrouched ? (p.y - 1) : (p.y - 7));
      bestT = t;
      bestResult = {
        hit: true,
        player: p,
        x: hitX,
        y: hitY,
        t,
        headshot: isHeadshot
      };
    }
  }

  return bestResult;
}

// Deterministic Player Movement, Jetpack, Crouch, and Multi-Polygon Slope Resolution
export function stepPlayerPhysics(player, input, dt, map = COMPILED_MAP) {
  if (player.dead) {
    player.crouched = false;
    return;
  }

  const wantsJetpack = !!input.jetpack;
  if (input.crouch !== undefined) {
    player.crouched = !!input.crouch;
  } else if (input.crouched !== undefined) {
    player.crouched = !!input.crouched;
  }
  if (wantsJetpack && player.fuel > 0.2) {
    player.crouched = false;
  }

  const weapon = getWeapon(player.activeWeaponId);
  const speedMult = weapon ? weapon.speedMultiplier : 1.0;
  const crouchMult = (player.crouched && player.grounded) ? 0.62 : 1.0;

  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  // 1. Horizontal acceleration & friction
  if (player.grounded) {
    if (moveDir !== 0) {
      const targetVx = moveDir * MAX_WALK_SPEED * speedMult * crouchMult;
      const accel = MOVE_ACCEL_GROUND * speedMult * crouchMult;
      if (player.vx < targetVx) {
        player.vx = Math.min(targetVx, player.vx + accel * dt);
      } else if (player.vx > targetVx) {
        player.vx = Math.max(targetVx, player.vx - accel * dt);
      }
    } else {
      player.vx *= Math.exp(-GROUND_FRICTION * dt);
      if (Math.abs(player.vx) < 2) player.vx = 0;
    }
  } else {
    if (moveDir !== 0) {
      const maxAirVx = MAX_AIR_SPEED_X * speedMult;
      const accel = MOVE_ACCEL_AIR * speedMult;
      if (moveDir > 0 && player.vx < maxAirVx) {
        player.vx = Math.min(maxAirVx, player.vx + accel * dt);
      } else if (moveDir < 0 && player.vx > -maxAirVx) {
        player.vx = Math.max(-maxAirVx, player.vx - accel * dt);
      }
    }
    player.vx *= Math.exp(-AIR_DRAG_X * dt);
  }

  // 2. Jetpack thrust & Fuel system
  if (wantsJetpack && player.fuel > 0.2) {
    player.jetpackActive = true;
    player.crouched = false;
    player.fuel = Math.max(0, player.fuel - JETPACK_BURN_RATE * dt);
    player.jetpackCooldown = JETPACK_COOLDOWN_DELAY;

    let upAccel = JETPACK_ACCEL * speedMult;
    if (player.vy > 0) {
      upAccel += JETPACK_COUNTER_FALL_BONUS * speedMult;
    }

    player.vy += (GRAVITY - upAccel) * dt;
    const maxUp = MAX_JETPACK_UP_SPEED * speedMult;
    if (player.vy < maxUp) {
      player.vy = maxUp + (player.vy - maxUp) * Math.exp(-10 * dt);
    }
    player.grounded = false;
  } else {
    player.jetpackActive = false;
    player.vy += GRAVITY * dt;
    if (input.down && !player.grounded) {
      player.vy += 240 * dt;
    }
    if (player.vy > MAX_FALL_SPEED) {
      player.vy = MAX_FALL_SPEED;
    }

    if (player.jetpackCooldown > 0) {
      player.jetpackCooldown = Math.max(0, player.jetpackCooldown - dt);
    }

    if (player.grounded) {
      player.fuel = Math.min(JETPACK_FUEL_MAX, player.fuel + JETPACK_REGEN_GROUND * dt);
    } else if ((player.jetpackCooldown || 0) <= 0) {
      player.fuel = Math.min(JETPACK_FUEL_MAX, player.fuel + JETPACK_REGEN_AIR * dt);
    }
  }

  player.vy *= Math.exp(-AIR_DRAG_Y * dt);

  // 3. Sub-stepped integration + multi-polygon collision resolution
  const SUBSTEPS = 2;
  const subDt = dt / SUBSTEPS;
  const r = player.crouched ? (PLAYER_RADIUS * 0.78) : PLAYER_RADIUS;
  const colOffset = player.crouched ? (PLAYER_RADIUS - r) : 0;
  let groundedThisTick = false;
  let groundNy = -1;

  for (let step = 0; step < SUBSTEPS; step++) {
    player.x += player.vx * subDt;
    player.y += player.vy * subDt;

    const cx = player.x;
    const cy = player.y + colOffset;

    const pMinX = cx - r - 4;
    const pMinY = cy - r - 4;
    const pMaxX = cx + r + 4;
    const pMaxY = cy + r + 4;

    const polys = map.polygons;
    for (let pIdx = 0; pIdx < polys.length; pIdx++) {
      const poly = polys[pIdx];
      if (poly.maxX < pMinX || poly.minX > pMaxX || poly.maxY < pMinY || poly.minY > pMaxY) {
        continue;
      }

      const edges = poly.edges;
      for (let eIdx = 0; eIdx < edges.length; eIdx++) {
        const e = edges[eIdx];
        if (e.maxX < pMinX || e.minX > pMaxX || e.maxY < pMinY || e.minY > pMaxY) {
          continue;
        }

        const curCx = player.x;
        const curCy = player.y + colOffset;
        const cp = closestPointOnSegment(curCx, curCy, e.ax, e.ay, e.bx, e.by);
        const dx = curCx - cp.x;
        const dy = curCy - cp.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < r * r) {
          const dist = Math.sqrt(distSq);
          let nx, ny;
          if (dist > 1e-4) {
            nx = dx / dist;
            ny = dy / dist;
          } else {
            nx = e.nx;
            ny = e.ny;
          }

          // Prevent internal seam snagging: normal should roughly align with outward edge normal
          const dotOutward = nx * e.nx + ny * e.ny;
          if (dotOutward < -0.25) {
            continue;
          }

          const penetration = r - dist;
          player.x += nx * penetration;
          player.y += ny * penetration;

          // Walkable ground/slope check (outward normal pointing upward)
          if (ny < -0.46) {
            groundedThisTick = true;
            if (ny < groundNy) groundNy = ny;

            if (!player.jetpackActive) {
              const vn = player.vx * nx + player.vy * ny;
              if (vn < 0) {
                // Project velocity smoothly along slope tangent
                player.vx -= nx * vn;
                player.vy -= ny * vn;
              }
              // Keep feet glued slightly on gentle downhill slopes when walking
              if (moveDir !== 0 && player.vy < 0 && ny < -0.65) {
                player.vy *= 0.5;
              }
            } else {
              const vn = player.vx * nx + player.vy * ny;
              if (vn < 0) {
                player.vx -= nx * vn;
                player.vy -= ny * vn;
              }
            }
          } else {
            // Wall or ceiling slide
            const vn = player.vx * nx + player.vy * ny;
            if (vn < 0) {
              player.vx -= nx * vn;
              player.vy -= ny * vn;
            }
          }
        }
      }

      // Deep-inside safety check (if center ever got pushed inside a solid polygon)
      if (pointInPolygon(player.x, player.y + colOffset, poly.vertices)) {
        let bestDist = Infinity;
        let bestEdge = null;
        let bestCp = null;
        for (let eIdx = 0; eIdx < edges.length; eIdx++) {
          const e = edges[eIdx];
          const cp = closestPointOnSegment(player.x, player.y + colOffset, e.ax, e.ay, e.bx, e.by);
          const d = Math.hypot(player.x - cp.x, (player.y + colOffset) - cp.y);
          if (d < bestDist) {
            bestDist = d;
            bestEdge = e;
            bestCp = cp;
          }
        }
        if (bestEdge && bestCp) {
          player.x = bestCp.x + bestEdge.nx * (r + 1);
          player.y = bestCp.y + bestEdge.ny * (r + 1) - colOffset;
          const vn = player.vx * bestEdge.nx + player.vy * bestEdge.ny;
          if (vn < 0) {
            player.vx -= bestEdge.nx * vn;
            player.vy -= bestEdge.ny * vn;
          }
          if (bestEdge.ny < -0.46) groundedThisTick = true;
        }
      }
    }
  }

  player.grounded = groundedThisTick;

  // 4. World perimeter boundaries
  const margin = 42;
  if (player.x < margin) {
    player.x = margin;
    if (player.vx < 0) player.vx = 0;
  } else if (player.x > WORLD_WIDTH - margin) {
    player.x = WORLD_WIDTH - margin;
    if (player.vx > 0) player.vx = 0;
  }

  if (player.y < margin) {
    player.y = margin;
    if (player.vy < 0) player.vy = 0;
  }
}

// Step physics for a thrown Bomb (Frag Grenade, M7 Gas Grenade, or sticky Proxy Mine)
export function stepGrenadePhysics(grenade, dt, map = COMPILED_MAP) {
  if (grenade.stuck) {
    return false;
  }

  grenade.vy += GRAVITY * 0.92 * dt;
  grenade.vx *= Math.exp(-0.25 * dt);
  grenade.vy *= Math.exp(-0.25 * dt);

  const nextX = grenade.x + grenade.vx * dt;
  const nextY = grenade.y + grenade.vy * dt;
  let bounced = false;

  // Raycast path first to prevent fast tunnel through thin bunker walls
  const hit = raycastMap(grenade.x, grenade.y, nextX, nextY, map);
  if (hit.hit) {
    if (grenade.isSticky) {
      grenade.x = hit.x + hit.nx * 2.8;
      grenade.y = hit.y + hit.ny * 2.8;
      grenade.vx = 0;
      grenade.vy = 0;
      grenade.stuck = true;
      grenade.nx = hit.nx;
      grenade.ny = hit.ny;
      return true;
    }

    grenade.x = hit.x + hit.nx * (GRENADE_RADIUS + 0.5);
    grenade.y = hit.y + hit.ny * (GRENADE_RADIUS + 0.5);
    const vn = grenade.vx * hit.nx + grenade.vy * hit.ny;
    if (vn < 0) {
      const tx = -hit.ny;
      const ty = hit.nx;
      const vt = grenade.vx * tx + grenade.vy * ty;
      grenade.vx = tx * vt * GRENADE_FRICTION - hit.nx * vn * GRENADE_RESTITUTION;
      grenade.vy = ty * vt * GRENADE_FRICTION - hit.ny * vn * GRENADE_RESTITUTION;
      if (Math.hypot(grenade.vx, grenade.vy) > 45) {
        bounced = true;
      }
    }
  } else {
    grenade.x = nextX;
    grenade.y = nextY;
  }

  // Circle vs edges contact resolution for resting / rolling grenades
  const r = grenade.isSticky ? 4.2 : GRENADE_RADIUS;
  const pMinX = grenade.x - r - 2;
  const pMinY = grenade.y - r - 2;
  const pMaxX = grenade.x + r + 2;
  const pMaxY = grenade.y + r + 2;

  const edges = map.allEdges;
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.maxX < pMinX || e.minX > pMaxX || e.maxY < pMinY || e.minY > pMaxY) continue;
    const cp = closestPointOnSegment(grenade.x, grenade.y, e.ax, e.ay, e.bx, e.by);
    const dx = grenade.x - cp.x;
    const dy = grenade.y - cp.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < r * r) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const ny = dy / dist;
      if (nx * e.nx + ny * e.ny < -0.25) continue;

      if (grenade.isSticky) {
        grenade.x = cp.x + e.nx * 2.8;
        grenade.y = cp.y + e.ny * 2.8;
        grenade.vx = 0;
        grenade.vy = 0;
        grenade.stuck = true;
        grenade.nx = e.nx;
        grenade.ny = e.ny;
        return true;
      }

      grenade.x += nx * (r - dist);
      grenade.y += ny * (r - dist);

      const vn = grenade.vx * nx + grenade.vy * ny;
      if (vn < 0) {
        if (Math.abs(vn) > 65) bounced = true;
        const tx = -ny;
        const ty = nx;
        const vt = grenade.vx * tx + grenade.vy * ty;
        grenade.vx = tx * vt * GRENADE_FRICTION - nx * vn * GRENADE_RESTITUTION;
        grenade.vy = ty * vt * GRENADE_FRICTION - ny * vn * GRENADE_RESTITUTION;
      }
    }
  }

  grenade.angle = (grenade.angle || 0) + (grenade.vx * 0.04) * dt * 60;
  return bounced;
}

