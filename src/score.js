import { rgb } from "./engine.js";
import { spawnFloatingText } from "./gameEffects.js";

// Score values per kill. Tunable here.
export const SCORE = {
  enemy: 100,
  orbiter: 250,
  orbiterLoot: 500,
  missile: 50,
  boss: 10000,
};

let score = 0;

export function getScore() {
  return score;
}

export function addScore(n) {
  score += n;
}

// Score popup tiers — tinted/sized so big kills read at a glance.
export function addScoreAt(pos, n) {
  score += n;
  const big = n >= 1000;
  const med = !big && n >= 250;
  const color = big ? rgb(1, 0.85, 0.3) : med ? rgb(0.4, 0.9, 1) : rgb(1, 1, 1);
  const size = big ? 2.4 : med ? 1.6 : 1.1;
  const duration = big ? 1.6 : 1.0;
  const rise = big ? 3.5 : 2.2;
  spawnFloatingText(pos, `+${n}`, { color, size, duration, rise });
}

export function resetScore() {
  score = 0;
}

export function formatScore(width = 6) {
  return score.toString().padStart(width, "0");
}
