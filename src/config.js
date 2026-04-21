import { vec2, rgb } from "../node_modules/littlejsengine/dist/littlejs.esm.js";

const ASSET_PATH = "public/assets/";
const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
const SPRITE_SHEET2_NAME = "sheet";

export const SPRITE_SHEET_PATHS = [
  `${ASSET_PATH}${SPRITE_SHEET_NAME}`,
  `${ASSET_PATH}${SPRITE_SHEET2_NAME}`,
];

const CANVAS_SIZE = vec2(1280, 720);
const LEVEL_SIZE = vec2(22, 22);

export const system = {
  canvasSize: CANVAS_SIZE,
  levelSize: LEVEL_SIZE,
  cameraPos: LEVEL_SIZE.scale(0.5),
  spriteSheetLists: SPRITE_SHEET_PATHS.map((p) => `${p}.png`),
  particleSheetName: "particles",
  particleLists: [
    "fire_01.png",
    "fire_02.png",
    "muzzle_01.png",
    "muzzle_02.png",
    "muzzle_03.png",
    "muzzle_04.png",
    "muzzle_05.png",
    "scorch_01.png",
    "scorch_02.png",
    "scorch_03.png",
    "smoke_01.png",
    "smoke_02.png",
    "smoke_03.png",
    "smoke_04.png",
    "smoke_05.png",
    "smoke_06.png",
    "smoke_07.png",
    "smoke_08.png",
    "smoke_09.png",
    "smoke_10.png",
    "circle_01.png",
  ].map((p) => `public/assets/particles/${p}`),
  shootKey: "Space",
  focusKey: "ShiftLeft",
};

export const engine = {
  objectMaxSpeed: 0.4,
  worldScale: 0.015,
  minCollisionRadius: 0.4,
};

export const player = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "playerShip2_blue.png",
  accel: 0.3,
  damping: 0.5,
  focusSpeedScale: 0.5,
  shootCooldown: 8,
  cannonOffsets: [vec2(22, 40), vec2(85, 40)],
  hp: 5,
  hitboxScale: 0.25,
  mirrorX: false,
  mirrorY: true,
  exhaust: {
    emitRateBase: 60, // neutral emitRate
    emitRateRange: 60, // ±range added/subtracted by vertical input
    sizeStart: 1, // particle size at birth
    sizeStartBoost: 0.5, // extra size added when thrusting up
  },
};

export const bullet = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "laserRed04.png",
  speed: 0.3,
  size: vec2(0.2, 0.2),
  despawnRadius: 0.5,
  hitboxScale: 1.0,
  mirrorY: true,
};

export const enemyBullet = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceMissiles_001.png",
  speed: 0.3,
  size: vec2(0.3, 0.5),
  despawnRadius: 0.5,
  hitboxScale: 1.0,
};

export const bossBullet = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "laserRed08.png",
  speed: 0.2,
  size: vec2(0.8),
  despawnRadius: 0.5,
  hitboxScale: 0.5,
};

export const missile = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceMissiles_006.png",
  hp: 3,
  speed: 0.12,
  homingStrength: 0.008, // acceleration toward player each frame
  size: vec2(0.7, 0.7),
  hitboxScale: 0.7,
  mirrorY: true,
  volleys: 3, // nova pulses between each missile salvo
  lifetime: 6, // seconds before missile detonates
};

export const enemy = {
  swarm: {
    type1: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_002.png",
      hp: 3,
      speed: 0.1,
      stopToFire: true,
      fireRate: 60,
      color: rgb(0.5, 1, 0.5),
      hitboxScale: 0.8,
      mirrorY: true,
    },
    type2: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_005.png",
      hp: 8,
      speed: 0.05,
      color: rgb(0.8, 0.5, 1),
      hitboxScale: 0.8,
      mirrorY: true,
    },
    type3: {
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_001.png",
      hp: 5,
      speed: 0.2,
      diving: true,
      color: rgb(1, 0.5, 0.5),
      hitboxScale: 0.8,
      mirrorY: true,
    },
  },
  flocking: {
    cohesion: 0.01,
    separation: 0.05,
    alignment: 0.02,
    playerAttraction: 0.005,
  },
};

export const boss = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceShips_007.png",
  hp: 500,
  speed: 0.05,
  size: vec2(6, 6),
  color: rgb(1, 1, 1),
  novaRate: 180,
  fireLocations: [vec2(-1.5, 2), vec2(1.5, 2), vec2(-1.5, -1), vec2(1.5, -1)],
  hitboxScale: 0.8,
  mirrorY: true,
};

export const beam = {
  rate: 600,
  duration: 180,
  endDuration: 30, // duration for shrinking at the end
  rotationSpeed: 0.007,
  count: 3,
  length: 60,
  width: 0.6,
};

export const orbiter = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "ufoRed.png",
  hp: 25,
  radius: 6,
  speed: 0.03,
  size: vec2(2),
  color: rgb(1, 1, 1),
  hitboxScale: 0.8,
  diveRate: 600,
  diveSpeed: 0.4,
  warningTime: 1.5, // seconds to blink before diving
};

export const shield = {
  sprite: "circle_01.png",
  radiusOffset: 2.4,
  pulseSpeed: 4,
  pulseMagnitude: 0.05,
  baseColor: rgb(0.2, 0.5, 1, 0.4),
  hitColor: rgb(0.8, 0.9, 1, 0.8),
  colorFadeSpeed: 0.1,
  bounceSpeed: 0.05,
  playerHitRadiusScale: 0.4,
  renderOrder: 1,
};

export const ui = {
  debugPos: vec2(1700, 64),
  debugSize: 30,
  debugColor: rgb(1, 0, 0),
};
