import { economy as economyCfg } from "../config/index.js";

const STORAGE_KEY = "alienpi.economy.v1";

let substrate = 0;
let debt = economyCfg.startingLoan;
let totalEarned = 0;
let lastRun = null; // { earnings, bossBonus, repair, net, outcome, hpLost }

// Per-run accumulators — reset by beginRun().
let runEarnings = 0;
let runHpLost = 0;
let runActive = false;

export function getSubstrate() {
  return substrate;
}

export function getDebt() {
  return debt;
}

export function getTotalEarned() {
  return totalEarned;
}

export function getLastRun() {
  return lastRun;
}

export function loadEconomy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      substrate = 0;
      debt = economyCfg.startingLoan;
      totalEarned = 0;
      lastRun = null;
      return;
    }
    const parsed = JSON.parse(raw);
    substrate = Number.isFinite(parsed.substrate) ? parsed.substrate : 0;
    debt = Number.isFinite(parsed.debt) ? parsed.debt : economyCfg.startingLoan;
    totalEarned = Number.isFinite(parsed.totalEarned) ? parsed.totalEarned : 0;
    lastRun = parsed.lastRun || null;
  } catch {
    substrate = 0;
    debt = economyCfg.startingLoan;
    totalEarned = 0;
    lastRun = null;
  }
}

export function saveEconomy() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ substrate, debt, totalEarned, lastRun }),
    );
  } catch {
    // Storage write failed (private mode, quota): keep in-memory value.
  }
}

export function resetEconomy() {
  substrate = 0;
  debt = economyCfg.startingLoan;
  totalEarned = 0;
  lastRun = null;
  runEarnings = 0;
  runHpLost = 0;
  runActive = false;
  saveEconomy();
}

// Begin a fresh run — call from PRE_RUN → PLAYING transition.
export function beginRun() {
  runEarnings = 0;
  runHpLost = 0;
  runActive = true;
}

// Hooked from score.js — converts score points to substrate via payoutRatio.
export function addEarnings(scorePoints) {
  if (!runActive) return;
  runEarnings += Math.round(scorePoints * economyCfg.payoutRatio);
}

export function recordHpLost(amount) {
  if (!runActive) return;
  runHpLost += amount;
}

// Commit run to persistent state. outcome: "victory" | "defeat".
// Returns the debrief breakdown for display.
export function commitRun(outcome) {
  const earnings = runEarnings;
  const bossBonus = outcome === "victory" ? economyCfg.bossClearBonus : 0;
  const repair = runHpLost * economyCfg.repairCostPerHp;
  const grossGain = earnings + bossBonus;
  const net = grossGain - repair;

  // Death penalty (currently 0% for MVP — kept here so the knob exists).
  const penalty =
    outcome === "defeat"
      ? Math.round(grossGain * economyCfg.deathPenaltyRatio)
      : 0;

  substrate += net - penalty;
  totalEarned += Math.max(0, grossGain);

  const breakdown = {
    outcome,
    earnings,
    bossBonus,
    repair,
    penalty,
    net: net - penalty,
    hpLost: runHpLost,
    balance: substrate,
    debt,
  };
  lastRun = breakdown;
  runActive = false;
  saveEconomy();
  return breakdown;
}

// Format helper used by HUD and debrief screens.
// Compact form: 12345 → "12.3K", 1234567 → "1.23M". Smaller values keep raw digits with commas.
export function formatSubstrate(n, { compact = true } = {}) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + "M";
    if (abs >= 10_000) return sign + (abs / 1000).toFixed(1) + "K";
  }
  return sign + abs.toLocaleString("en-US");
}
