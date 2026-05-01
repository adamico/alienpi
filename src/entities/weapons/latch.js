import { vec2, engineObjects } from "../../engine.js";
import { weapons as weaponsCfg } from "../../config/index.js";
import { soundLatch, soundLatchCharge } from "../../audio/sounds.js";
import { playSfx } from "../../audio/soundManager.js";

/**
 * Update the latch weapon for one frame.
 *
 * @param {object} ctx          WeaponContext provided by Player
 * @param {object} weaponLevels Live reference to the WeaponSystem levels map
 * @param {object} state        Mutable latch state owned by WeaponSystem:
 *                              { soundTimer: number, wasFiring: boolean }
 */
export function updateLatch(ctx, weaponLevels, state) {
  const level = weaponLevels.latch;
  const cfg = weaponsCfg.latch;
  const firing = ctx.isFiring;

  if (!firing) {
    clearLatchBeams(ctx);
    state.soundTimer = 0;
    state.wasFiring = false;
    return;
  }

  const count = cfg.count[level - 1];

  if (!state.wasFiring) {
    playSfx(soundLatchCharge);
    state.wasFiring = true;
  }
  if (state.soundTimer <= 0) {
    playSfx(soundLatch);
    state.soundTimer = 36;
  } else {
    state.soundTimer--;
  }

  acquireLatchTargets(ctx, weaponLevels);

  const anyTarget = ctx.latchBeams.some((b) => b.target);

  const cone = cfg.fanCone;
  for (let i = 0; i < count; i++) {
    const beam = ctx.latchBeams[i];
    beam.isFiring = !anyTarget || !!beam.target;

    const t = count === 1 ? 0.5 : i / (count - 1);
    beam.fanAngle = -cone / 2 + t * cone;
  }

  assignLatchEndOffsets(ctx);
}

export function clearLatchBeams(ctx) {
  for (const beam of ctx.latchBeams) beam.clear();
}

/**
 * When multiple beams share a target, spread their endpoints perpendicular to
 * the beam direction so each terminates at a distinct point on the target.
 */
function assignLatchEndOffsets(ctx) {
  const origin = ctx.pos;
  const groups = new Map();

  for (const beam of ctx.latchBeams) {
    beam.endOffset = null;
    if (!beam.target) continue;
    const list = groups.get(beam.target);
    if (list) list.push(beam);
    else groups.set(beam.target, [beam]);
  }

  for (const [target, beams] of groups) {
    const n = beams.length;
    if (n === 1) continue;

    const dir = target.pos.subtract(origin);
    const len = dir.length();
    if (len < 0.001) continue;
    const perp = vec2(-dir.y / len, dir.x / len);

    const span = target.size.x * 0.4;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      beams[i].endOffset = perp.scale(t * span);
    }
  }
}

/**
 * Assigns up to `count` enemy targets to beams, preferring nearest.
 * Existing alive+in-range targets are kept; idle beams pick the closest
 * unclaimed enemy.
 */
function acquireLatchTargets(ctx, weaponLevels) {
  const cfg = weaponsCfg.latch;
  const level = weaponLevels.latch;
  const count = cfg.count[level - 1];
  const range = cfg.range[level - 1];
  const origin = ctx.pos;
  const rangeSq = range * range;

  for (const beam of ctx.latchBeams) {
    const t = beam.target;
    if (!t || t.destroyed || t.hp <= 0) {
      beam.target = null;
    } else if (t.shield && !t.shield.destroyed) {
      beam.target = null;
    } else if (t.pos.distanceSquared(origin) > rangeSq) {
      beam.target = null;
    }
  }

  const candidates = [];
  for (const o of engineObjects) {
    if (!o || o.destroyed) continue;
    if (typeof o.hp !== "number" || o.hp <= 0) continue;
    if (!o.isEnemy) continue;
    if (o.shield && !o.shield.destroyed) continue;
    const dSq = o.pos.distanceSquared(origin);
    if (dSq > rangeSq) continue;
    candidates.push({ o, dSq });
  }
  if (candidates.length === 0) return;
  candidates.sort((a, b) => a.dSq - b.dSq);

  const used = new Set(ctx.latchBeams.map((b) => b.target).filter(Boolean));
  let ci = 0;
  for (let i = 0; i < count; i++) {
    const beam = ctx.latchBeams[i];
    if (beam.target) continue;
    while (ci < candidates.length && used.has(candidates[ci].o)) ci++;
    if (ci >= candidates.length) break;
    beam.setTarget(candidates[ci].o);
    used.add(candidates[ci].o);
    ci++;
  }

  for (let i = count; i < ctx.latchBeams.length; i++) {
    ctx.latchBeams[i].clear();
  }
}
