import { setTimeScale, timeReal } from "../engine.js";
import { engine, player as playerCfg } from "../config/index.js";

/**
 * Game-time controller. Now backed by the engine's real `setTimeScale` API
 * (LittleJS commit 4403531+). Two independent channels:
 *
 *   - `hit`: G6 transient pulse on player damage. Eases minScale → 1 over a
 *     short duration. Re-triggering extends the end (capped).
 *   - `hold`: G5 sustained slow-mo while the focus action is held + charge
 *     remains. On release ramps back to 1 over `releaseRampSeconds`.
 *
 * Each frame the channels are evaluated and the **lower** scale wins
 * (slowest world rules), then pushed to `setTimeScale`. Outside gameplay the
 * controller resets the engine to scale 1.
 */

// hit channel
let hitStart = -Infinity;
let hitEnd = -Infinity;

// hold channel
let holdActive = false;
let holdReleaseTime = -Infinity;

let currentScale = 1;

export function triggerSlowMo() {
  const cfg = engine.slowMo;
  const now = timeReal;
  if (hitEnd > now) {
    const cap = hitStart + cfg.totalCap;
    hitEnd = Math.min(hitEnd + cfg.duration * cfg.extendRatio, cap);
  } else {
    hitStart = now;
    hitEnd = now + cfg.duration;
  }
}

export function setHoldSlowMo(active) {
  if (active && !holdActive) {
    holdActive = true;
  } else if (!active && holdActive) {
    holdActive = false;
    holdReleaseTime = timeReal;
  }
}

export function cancelSlowMo() {
  hitStart = hitEnd = -Infinity;
  holdActive = false;
  holdReleaseTime = -Infinity;
  currentScale = 1;
  setTimeScale(1);
}

function computeHitScale(now) {
  if (now >= hitEnd) return 1;
  const cfg = engine.slowMo;
  const lifetime = hitEnd - hitStart;
  const p = lifetime > 0 ? (now - hitStart) / lifetime : 1;
  const eased = 1 - (1 - p) * (1 - p);
  return cfg.minScale + (1 - cfg.minScale) * eased;
}

function computeHoldScale(now) {
  const fc = playerCfg.focusCharge;
  if (holdActive) return fc.worldTimeScale;
  if (holdReleaseTime <= -Infinity) return 1;
  const t = now - holdReleaseTime;
  if (t >= fc.releaseRampSeconds) {
    holdReleaseTime = -Infinity;
    return 1;
  }
  const p = t / fc.releaseRampSeconds;
  const eased = 1 - (1 - p) * (1 - p);
  return fc.worldTimeScale + (1 - fc.worldTimeScale) * eased;
}

export function tickTimeScale(gameplayActive) {
  if (!gameplayActive) {
    if (currentScale !== 1) {
      currentScale = 1;
      setTimeScale(1);
    }
    return;
  }
  const now = timeReal;
  const next = Math.min(computeHitScale(now), computeHoldScale(now));
  if (next !== currentScale) {
    currentScale = next;
    setTimeScale(next);
  }
}

export function getCurrentTimeScale() {
  return currentScale;
}

export function isSlowMoActive() {
  return currentScale < 1;
}
