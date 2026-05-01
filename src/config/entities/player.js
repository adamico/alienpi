import { vec2 } from "../../engine.js";

export const player = {
  accel: 0.3,
  damping: 0.5,
  exhaust: {
    emitRateBase: 60, // neutral emitRate
    emitRateRange: 60, // ±range added/subtracted by vertical input
    sizeStart: 1, // particle size at birth
    sizeStartBoost: 0.5, // extra size added when thrusting up
  },
  focusSpeedScale: 0.5,
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
