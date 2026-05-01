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
  size: vec2(0.8),
  speed: 0.2,
  sprite: "laserRed08.png",
};
