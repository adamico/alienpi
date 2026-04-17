import { vec2, rgb } from "../node_modules/littlejsengine/dist/littlejs.esm.js";

const ASSET_PATH = "public/assets/";
const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
export const SPRITE_SHEET_PATH = `${ASSET_PATH}${SPRITE_SHEET_NAME}`;

const CANVAS_SIZE = vec2(1280, 720);
const LEVEL_SIZE = vec2(20, 20);

export const system = {
  canvasSize: CANVAS_SIZE,
  levelSize: LEVEL_SIZE,
  cameraPos: LEVEL_SIZE.scale(0.5),
  spriteSheet: [`${SPRITE_SHEET_PATH}.png`],
  shootKey: "Space",
  focusKey: "ShiftLeft",
};

export const engine = {
  objectMaxSpeed: 0.4,
  worldScale: 0.015,
  minCollisionRadius: 0.4,
};

export const player = {
  sprite: "spaceShips_008.png",
  accel: 0.3,
  damping: 0.5,
  focusSpeedScale: 0.5,
  shootCooldown: 10,
  // Cannon muzzle positions in atlas-pixel coords (top-left origin), as you'd
  // measure on the sprite image. Converted to world offsets at fire time, so
  // they stay anchored to the artwork when worldScale changes.
  cannonOffsets: [vec2(22, 70), vec2(78, 70)],
};

export const bullet = {
  sprite: "spaceMissiles_001.png",
  speed: 0.3,
  despawnRadius: 0.5,
};

export const enemy = {
  sprite: "enemyBlack1.png",
};

export const ui = {
  debugPos: vec2(1700, 64),
  debugSize: 30,
  debugColor: rgb(1, 0, 0),
};
