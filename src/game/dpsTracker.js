import { time } from "../engine.js";

const WINDOW_SECONDS = 2;
const LOG_INTERVAL_SECONDS = 3;
const TRACKED_WEAPONS = ["vulcan", "shotgun", "latch"];
const events = new Map(); // weaponKey -> [{t, amount, target, enemyCount}]
const peaks = new Map(); // weaponKey -> { overall, perTarget, overallEnemies, perTargetEnemies }
let lastLogTime = 0;
let currentEnemyCount = 0;

export function setEnemyCount(n) {
  currentEnemyCount = n;
}

function trim(list) {
  const cutoff = time - WINDOW_SECONDS;
  while (list.length && list[0].t < cutoff) list.shift();
}

function bumpPeak(weaponKey, kind, value, enemies) {
  let p = peaks.get(weaponKey);
  if (!p) {
    p = { overall: 0, perTarget: 0, overallEnemies: 0, perTargetEnemies: 0 };
    peaks.set(weaponKey, p);
  }
  if (value > p[kind]) {
    p[kind] = value;
    p[kind + "Enemies"] = enemies;
  }
}

export function recordDamage(weaponKey, amount, target) {
  if (!weaponKey || !amount) return;
  let list = events.get(weaponKey);
  if (!list) {
    list = [];
    events.set(weaponKey, list);
  }
  list.push({ t: time, amount, target, enemyCount: currentEnemyCount });
}

// Sum of damage across all targets in the last window, per second.
export function getDPS(weaponKey) {
  const list = events.get(weaponKey);
  if (!list || list.length === 0) return 0;
  trim(list);
  let sum = 0;
  for (const e of list) sum += e.amount;
  const dps = sum / WINDOW_SECONDS;
  bumpPeak(weaponKey, "overall", dps, currentEnemyCount);
  return dps;
}

// Max damage-per-second sustained against any single target in the window.
export function getPerTargetDPS(weaponKey) {
  const list = events.get(weaponKey);
  if (!list || list.length === 0) return 0;
  trim(list);
  const sums = new Map();
  for (const e of list) {
    sums.set(e.target, (sums.get(e.target) ?? 0) + e.amount);
  }
  let max = 0;
  for (const v of sums.values()) if (v > max) max = v;
  const dps = max / WINDOW_SECONDS;
  bumpPeak(weaponKey, "perTarget", dps, currentEnemyCount);
  return dps;
}

export function getPeakDPS(weaponKey) {
  return peaks.get(weaponKey)?.overall ?? 0;
}

export function getPeakDPSEnemies(weaponKey) {
  return peaks.get(weaponKey)?.overallEnemies ?? 0;
}

export function getPerTargetPeakDPS(weaponKey) {
  return peaks.get(weaponKey)?.perTarget ?? 0;
}

export function getPerTargetPeakDPSEnemies(weaponKey) {
  return peaks.get(weaponKey)?.perTargetEnemies ?? 0;
}

// Prints a compact table once every LOG_INTERVAL_SECONDS. Call each frame.
export function tickDPSLog() {
  if (time - lastLogTime < LOG_INTERVAL_SECONDS) return;
  lastLogTime = time;

  const rows = TRACKED_WEAPONS.map((w) => {
    const o = getDPS(w).toFixed(1);
    const t = getPerTargetDPS(w).toFixed(1);
    const po = getPeakDPS(w).toFixed(1);
    const poe = getPeakDPSEnemies(w);
    const pt = getPerTargetPeakDPS(w).toFixed(1);
    const pte = getPerTargetPeakDPSEnemies(w);
    const peakOStr = `${po.padStart(6)} (${poe}e)`;
    const peakTStr = `${pt.padStart(6)} (${pte}e)`;
    return `  ${w.padEnd(8)} ${o.padStart(6)} ${t.padStart(6)}   ${peakOStr.padStart(12)} ${peakTStr.padStart(12)}`;
  });

  console.log(
    [
      `[DPS @ ${time.toFixed(1)}s, enemies: ${currentEnemyCount}]   overall /target   peak-o (enemies) peak-/t (enemies)`,
      ...rows,
    ].join("\n"),
  );
}

