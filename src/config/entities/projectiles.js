import { vec2 } from "../../engine.js";
import { SPRITE_SHEET_NAME, SPRITE_SHEET2_NAME } from "../constants.js";

export const enemyBullet = {
  despawnRadius: 0.5,
  hitboxScale: 1.0,
  sheet: SPRITE_SHEET_NAME,
  size: vec2(0.2, 0.2),
  speed: 0.3,
  sprite: "spaceMissiles_009.png",
};

export const bossBullet = {
  despawnRadius: 0.5,
  hitboxScale: 0.5,
  sheet: SPRITE_SHEET2_NAME,
  size: vec2(1.05),
  speed: 0.1,
  sprite: "laserRed08.png",
  render: {
    corePulse: {
      speed: 10,
      glowColor: { r: 1, g: 0.85, b: 0.45 },
      glowAlphaBase: 0.3,
      glowAlphaPulse: 0.12,
      glowSizeBase: 0.52,
      glowSizePulse: 0.08,
      coreColor: { r: 1, g: 0.98, b: 0.88 },
      coreAlphaBase: 0.85,
      coreAlphaPulse: 0.15,
      coreSizeBase: 0.22,
      coreSizePulse: 0.05,
    },
  },
};
