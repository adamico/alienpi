import { vec2, rgb } from "../node_modules/littlejsengine/dist/littlejs.esm.js";

const ASSET_PATH = "public/assets/";
const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
const SPRITE_SHEET2_NAME = "sheet";

export const SPRITE_SHEET_PATHS = [
  `${ASSET_PATH}${SPRITE_SHEET_NAME}`,
  `${ASSET_PATH}${SPRITE_SHEET2_NAME}`
];

const CANVAS_SIZE = vec2(1280, 720);
const LEVEL_SIZE = vec2(20, 20);

export const system = {
  canvasSize: CANVAS_SIZE,
  levelSize: LEVEL_SIZE,
  cameraPos: LEVEL_SIZE.scale(0.5),
  spriteSheetLists: SPRITE_SHEET_PATHS.map(p => `${p}.png`),
  shootKey: "Space",
  focusKey: "ShiftLeft",
};

export const engine = {
  objectMaxSpeed: 0.4,
  worldScale: 0.015,
  minCollisionRadius: 0.4,
};

export const player = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceShips_008.png",
  accel: 0.3,
  damping: 0.5,
  focusSpeedScale: 0.5,
  shootCooldown: 8,
  cannonOffsets: [vec2(22, 70), vec2(78, 70)],
  hp: 5,
};

export const bullet = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "laserRed04.png",
  speed: 0.3,
  size: vec2(0.2, 0.2),
  despawnRadius: 0.5,
};

export const enemyBullet = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceMissiles_001.png",
  speed: 0.3,
  size: vec2(0.3, 0.5),
  despawnRadius: 0.5,
};

export const enemy = {
  swarm: {
    type1: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_002.png",
      hp: 1,
      speed: 0.1,
      stopToFire: true,
      fireRate: 60,
      color: rgb(0.5, 1, 0.5),
    },
    type2: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_005.png",
      hp: 3,
      speed: 0.05,
      color: rgb(0.8, 0.5, 1),
    },
    type3: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_001.png",
      hp: 2,
      speed: 0.2,
      diving: true,
      color: rgb(1, 0.5, 0.5),
    }
  },
  flocking: {
    cohesion: 0.01,
    separation: 0.05,
    alignment: 0.02,
    playerAttraction: 0.005,
  }
};

export const boss = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceShips_007.png",
  hp: 200,
  speed: 0.05,
  size: vec2(5, 5),
  color: rgb(0.6, 1, 0.6),
  pulseRate: 180,
  fireLocations: [
    vec2(-1.5, 2),
    vec2(1.5, 2),
    vec2(-1.5, -2),
    vec2(1.5, -2),
  ],
};

export const orbiter = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceShips_005.png",
  hp: 100,
  radius: 5,
  speed: 0.03,
  size: vec2(1.5),
  color: rgb(0.4, 0.8, 1),
};

export const ui = {
  debugPos: vec2(1700, 64),
  debugSize: 30,
  debugColor: rgb(1, 0, 0),
};
