import { rgb, engineObjects } from "../engine.js";
import { spawnFloatingText } from "../visuals/gameEffects.js";
import { playSfx } from "../audio/soundManager.js";
import { soundScorePing } from "../audio/sounds.js";

// Score values per kill + arcade-score systems. Tunable here.
export const SCORE = {
  enemy: 100,
  orbiter: 250,
  orbiterLoot: 500,
  missile: 50,
  boss: 10000,
  bossClear: 5000, // boss-kill clear bonus (relocated from economy.bossClearBonus)
  proximity: {
    rate: 0.6, // multiplier contribution per hostile within falloff
    falloff: 4, // world units; influence ~halves at this distance
    min: 1,
    max: 5,
  },
  milestone: {
    p75: 1000,
    p50: 2500,
    p25: 5000,
  },
};

let score = 0;
let highScore = 0;
let proximityMul = 1;

export function getProximityMul() {
  return proximityMul;
}

export function setProximityMul(value) {
  proximityMul = value;
}

const HIGHSCORE_STORAGE_KEY = "alienpi.highscore.v1";

export function getScore() {
  return score;
}

export function getHighScore() {
  return highScore;
}

export function loadHighScore() {
  try {
    const raw = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    highScore = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    highScore = 0;
  }
}

// Returns true if the run set a new high score.
export function commitHighScore() {
  if (score <= highScore) return false;
  highScore = score;
  try {
    localStorage.setItem(HIGHSCORE_STORAGE_KEY, String(highScore));
  } catch {
    // Storage write failed (private mode, quota): keep in-memory value.
  }
  return true;
}

export function formatHighScore(width = 6) {
  return highScore.toString().padStart(width, "0");
}

export function addScore(n) {
  score += Math.round(n * proximityMul);
}

// Score popup tiers — tinted/sized so big kills read at a glance.
export function addScoreAt(pos, n) {
  score += Math.round(n * proximityMul);
  const big = n >= 1000;
  const med = !big && n >= 250;
  const color = big ? rgb(1, 0.85, 0.3) : med ? rgb(0.4, 0.9, 1) : rgb(1, 1, 1);
  const size = big ? 2.4 : med ? 1.6 : 1.1;
  const duration = big ? 1.6 : 1.0;
  const rise = big ? 3.5 : 2.2;
  spawnFloatingText(pos, `+${n}`, { color, size, duration, rise });
  // Audio feedback: pitch rises with kill tier so big kills sound more impressive.
  const pingVolume = big ? 0.9 : med ? 0.75 : 0.6;
  const pingPitch = big ? 1.6 : med ? 1.1 : 0.8;
  playSfx(soundScorePing, pos, pingVolume, pingPitch);
}

export function resetScore() {
  score = 0;
  proximityMul = 1;
}

// Per-frame proximity multiplier update. Called from gameUpdatePost.
// Sums a falloff-weighted contribution from each hostile entity near the
// player and clamps to [min, max]. Enemy projectiles count too — dodging
// thick bullet patterns rewards the player.
export function tickProximity(playerPos) {
  if (!playerPos) {
    proximityMul = 1;
    return;
  }
  const { rate, falloff, min, max } = SCORE.proximity;
  const f2 = falloff * falloff;
  let sum = 0;
  for (const o of engineObjects) {
    if (!o || o.destroyed) continue;
    const hostile =
      o.isEnemy || o.isBoss || (o.isBullet && o.isEnemy);
    if (!hostile) continue;
    const d2 = playerPos.distanceSquared(o.pos);
    sum += rate / (1 + d2 / f2);
  }
  const target = Math.max(min, Math.min(max, 1 + sum));
  // Light smoothing so the multiplier doesn't jitter frame-to-frame.
  proximityMul += (target - proximityMul) * 0.15;
}

export function formatScore(width = 6) {
  return score.toString().padStart(width, "0");
}
