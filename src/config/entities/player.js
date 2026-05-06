import { vec2 } from "../../engine.js";

export const player = {
  accel: 0.3,
  damping: 0.5,
  entry: {
    duration: 1.2, // seconds for the ship to fly in
    startY: -4, // spawn position below the bottom boundary
    targetY: 3, // final resting y position after entry
  },
  exhaust: {
    emitRateBase: 60, // neutral emitRate
    emitRateRange: 60, // ±range added/subtracted by vertical input
    sizeStart: 1, // particle size at birth
    sizeStartBoost: 0.5, // extra size added when thrusting up
  },
  focusCharge: {
    // G5 charge-based slow-mo. Hold focus → drain charge + slow world; release
    // or empty → regen passively. Kill bonus reserved for follow-up wiring.
    max: 2.0,
    drainPerSecond: 1.0,
    regenPerSecond: 0.5,
    killBonus: 0.5,
    minToActivate: 0.3,
    worldTimeScale: 0.3,
    releaseRampSeconds: 0.4,
  },
  hitboxScale: 0.2,
  hp: 5,
  hpIcon: "shipA3.png",
  hpIconSheet: "",
  mirrorX: false,
  mirrorY: true,
  sheet: "",
  size: vec2(2.5),
  sprite: "shipA3.png",
  weaponSystem: {
    maxLevel: 3,
    mode: "INDIVIDUAL", // "INDIVIDUAL" (loot per weapon) or "ACTIVE" (star loot for current weapon)
    startLevels: {
      latch: 0,
      shotgun: 0,
      vulcan: 1,
    },
  },
};
