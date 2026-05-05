import { setPaused, timeReal } from "../engine.js";
import { engine } from "../config/index.js";

/**
 * Game-time slow-mo controller.
 *
 * LittleJS does not expose a real `setTimeScale`, so we approximate it by
 * gating the engine's `paused` flag on a per-frame accumulator: when the
 * accumulator overflows 1.0 we let the engine tick this frame, otherwise we
 * pause it. The accumulator increment per frame is the desired time scale,
 * which ramps from `engine.slowMo.minScale` back to 1.0 over the effect's
 * lifetime.
 *
 * Caller is responsible for telling the controller whether the game is
 * currently in a state where slow-mo should run (i.e. PLAYING). Outside
 * gameplay the controller stays inert.
 */

let activeStart = -Infinity;
let activeEnd = -Infinity;
let accumulator = 0;
let owned = false;

/** Trigger slow-mo. Re-triggering extends the effect (capped). */
export function triggerSlowMo() {
  const cfg = engine.slowMo;
  const now = timeReal;
  if (activeEnd > now) {
    const cap = activeStart + cfg.totalCap;
    activeEnd = Math.min(activeEnd + cfg.duration * cfg.extendRatio, cap);
  } else {
    activeStart = now;
    activeEnd = now + cfg.duration;
  }
}

/** Cancel any active slow-mo immediately and release the pause flag. */
export function cancelSlowMo() {
  activeStart = -Infinity;
  activeEnd = -Infinity;
  accumulator = 0;
  if (owned) {
    setPaused(false);
    owned = false;
  }
}

/**
 * Per-frame tick. Pass `true` only while gameplay (PLAYING) is active so the
 * controller does not fight the menu/pause states for the engine pause flag.
 */
export function tickTimeScale(gameplayActive) {
  const now = timeReal;
  if (!gameplayActive) {
    // Outside gameplay, never touch global pause state; scene logic owns it.
    owned = false;
    accumulator = 0;
    return;
  }

  if (now >= activeEnd) {
    if (owned) {
      setPaused(false);
      owned = false;
      accumulator = 0;
    }
    return;
  }

  const cfg = engine.slowMo;
  const lifetime = activeEnd - activeStart;
  const p = lifetime > 0 ? (now - activeStart) / lifetime : 1;
  // ease-out: start at minScale, end at 1.0
  const eased = 1 - (1 - p) * (1 - p);
  const scale = cfg.minScale + (1 - cfg.minScale) * eased;

  accumulator += scale;
  if (accumulator >= 1) {
    accumulator -= 1;
    setPaused(false);
  } else {
    setPaused(true);
  }
  owned = true;
}

export function isSlowMoActive() {
  return timeReal < activeEnd;
}
