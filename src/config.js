import { vec2, rgb, PI } from "./engine.js";

export const GAME_STATES = {
  TITLE: "TITLE",
  PLAYING: "PLAYING",
  PAUSE: "PAUSE",
  GAMEOVER: "GAMEOVER",
  SETTINGS: "SETTINGS",
};

const ASSET_PATH = "public/assets/";
export const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
export const SPRITE_SHEET2_NAME = "sheet";

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
  enableSharpenShader: true,
  isResetting: false,
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
    "circle_05.png",
    "light_02.png",
    "spark_01.png",
    "spark_02.png",
    "spark_03.png",
    "spark_04.png",
    "spark_05.png",
    "spark_06.png",
    "spark_07.png",
    "star_01.png",
    "star_02.png",
    "star_05.png",
    "star_09.png",
    "trace_01.png",
    "trace_02.png",
    "trace_03.png",
    "trace_04.png",
    "trace_05.png",
    "trace_06.png",
    "trace_07.png",
    "crosshair017.png",
    "crosshair133.png",
  ].map((p) => {
    if (p.startsWith("crosshair")) return `public/assets/crosshairs/${p}`;
    return `public/assets/particles/${p}`;
  }),
  standaloneSprites: [
    "boss2.png",
    "drone.png",
    "drone-looter.png",
    "shipA3.png",
    "shipB2.png",
    "shipC3.png",
  ].map((p) => `${ASSET_PATH}${p}`),
  shootKey: "Space",
  focusKey: "ShiftLeft",
  switchKey: "KeyQ",
};

export const engine = {
  objectMaxSpeed: 0.4,
  worldScale: 0.015,
  minCollisionRadius: 0.4,
};

export const player = {
  sheet: "",
  sprite: "shipA3.png",
  hpIcon: "shipA3.png",
  hpIconSheet: "",
  accel: 0.3,
  damping: 0.5,
  size: vec2(2.5),
  focusSpeedScale: 0.5,
  hp: 5,
  hitboxScale: 0.2,
  mirrorX: false,
  mirrorY: true,
  exhaust: {
    emitRateBase: 60, // neutral emitRate
    emitRateRange: 60, // ±range added/subtracted by vertical input
    sizeStart: 1, // particle size at birth
    sizeStartBoost: 0.5, // extra size added when thrusting up
  },
  weaponSystem: {
    mode: "INDIVIDUAL", // "INDIVIDUAL" (loot per weapon) or "ACTIVE" (star loot for current weapon)
    maxLevel: 3,
    startLevels: {
      vulcan: 1,
      shotgun: 0,
      latch: 0,
    },
  },
};

const VULCAN_BASE_SPEED = 0.4;
const VULCAN_BASE_DAMAGE = 0.6;
const VULCAN_DAMAGE_STEP = 0;

const vulcanBullet = {
  sheet: SPRITE_SHEET2_NAME,
  sprite: "laserBlue04.png",
  speed: [VULCAN_BASE_SPEED, VULCAN_BASE_SPEED * 1.25, VULCAN_BASE_SPEED * 1.5],
  size: vec2(0.2, 0.2),
  despawnRadius: 0.5,
  hitboxScale: 1.0,
  mirrorY: true,
  trailLength: 5,
};

const shotgunBullet = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceMissiles_037.png",
  speed: 0.5,
  size: vec2(0.25, 0.25),
  despawnRadius: 0.5,
  hitboxScale: 0.8,
  mirrorY: true,
  trailLength: 3,
  renderOrder: 1,
};

const vulcanYOffset = 0.4;
const vulcanXOffset = 0.5;

export const weapons = {
  vulcan: {
    label: "VULCAN",
    damage: [
      VULCAN_BASE_DAMAGE,
      VULCAN_BASE_DAMAGE + VULCAN_DAMAGE_STEP,
      VULCAN_BASE_DAMAGE + VULCAN_DAMAGE_STEP * 2,
    ],
    cannonOffsets: [
      [vec2(0, 1)], // Level 1
      [vec2(-vulcanXOffset, vulcanYOffset), vec2(vulcanXOffset, vulcanYOffset)], // Level 2
      [
        vec2(-vulcanXOffset, vulcanYOffset),
        vec2(0, 1),
        vec2(vulcanXOffset, vulcanYOffset),
      ], // Level 3
    ],
    spawnJitterX: 0.05, // ± world units of random x jitter at spawn
    bullet: vulcanBullet,
    playerSprite: "shipA3.png",
    muzzleSprite: "muzzle_05.png",
    muzzleDuration: 0.15,
    muzzleAlpha: 1.0,
    muzzleColor: rgb(0.4, 1, 1),
    exhaustColor: rgb(0.4, 1, 1),
    exhaustOffsets: [vec2(-0.2, -1.2), vec2(0.2, -1.2)],
    closeRangeThreshold: 6,
    closeRangeCooldown: [6, 6, 6],
  },
  shotgun: {
    label: "SHOTGUN",
    cooldown: [40, 32, 24],
    count: [3, 5, 7],
    pierce: 3,
    damage: [0.4, 0.55, 0.7],
    coneBase: (40 * PI) / 180,
    coneMin: (16 * PI) / 180,
    coneMax: (80 * PI) / 180,
    muzzleOffsets: [
      [vec2(0, 0)], // Level 1
      [vec2(0, 0)], // Level 2
      [vec2(0, 0)], // Level 3
    ],
    bullet: shotgunBullet,
    playerSprite: "shipB2.png",
    muzzleSprite: "muzzle_05.png",
    muzzleDuration: 0.25,
    muzzleAlpha: 1.0,
    muzzleColor: rgb(1, 1, 1),
    exhaustColor: rgb(1, 0.5, 0.2),
    exhaustOffsets: [vec2(0, -1.3)],
  },
  latch: {
    label: "LATCH",
    count: [3, 5, 7], // max simultaneous beams
    cooldown: [40, 32, 24], // frames between damage ticks per beam
    damage: [1, 1, 1], // fixed damage at all levels
    range: [16, 16, 16], // max lock distance in world units
    muzzleOffsets: [
      [vec2(0, 0)], // Level 1
      [vec2(0, 0)], // Level 2
      [vec2(0, 0)], // Level 3
    ],
    lineWidth: 0.2,
    color: rgb(0.4, 1, 0.4, 0.9),
    muzzleSprite: "star_09.png",
    muzzleDuration: 0.2,
    muzzleAlpha: 0.8,
    muzzleColor: rgb(0.4, 1, 0.4, 0.9),
    muzzleSize: 0.8,
    muzzleRate: 30,
    fanCone: (60 * PI) / 180,
    latchPoint: {
      sizeStart: 2.4,
      sizeEnd: 0.1,
      particleTime: 0.2,
      emitRate: 40,
      color: rgb(0.4, 1, 0.4),
      alpha: 1.0,
    },
    renderOrder: 10,
    sparks: {
      sprites: ["spark_01.png", "spark_02.png", "spark_03.png", "spark_04.png"],
      emitSize: 0.15,
      emitTime: 0.08,
      emitRate: 80,
      coneAngle: PI,
      colorStartA: rgb(0, 1, 0.5, 1),
      colorStartB: rgb(0, 1, 0.2, 1),
      colorEndA: rgb(0, 1, 0.1, 0),
      colorEndB: rgb(0, 0.6, 0.05, 0),
      particleTime: 0.35,
      sizeStart: 0.35,
      sizeEnd: 0.05,
      speed: 0.12,
      angleSpeed: 0.3,
      damping: 0.9,
      angleDamping: 0.9,
      fadeRate: 0.3,
      randomness: 0.5,
    },
    beamSparks: {
      sprites: ["spark_01.png", "spark_02.png", "spark_03.png", "spark_04.png"],
      spawnChance: 0.6, // per-frame probability of emitting a trail spark
      emitSize: 0.05,
      emitTime: 0.05,
      emitRate: 300,
      coneAngle: PI,
      colorStartA: rgb(0, 1, 0.5, 1),
      colorStartB: rgb(0, 1, 0.2, 1),
      colorEndA: rgb(0, 1, 0.1, 0),
      colorEndB: rgb(0, 0.6, 0.05, 0),
      particleTime: 0.25,
      sizeStart: 1.18,
      sizeEnd: 0.2,
      speed: 0.06,
      angleSpeed: 0.2,
      damping: 0.9,
      angleDamping: 0.9,
      fadeRate: 0.4,
      randomness: 0.6,
      collideTiles: false, // collideTiles
      additive: true, // additive
      randomColorLinear: true, // randomColorLinear
      renderOrder: 1, // renderOrder
      localSpace: true, // localSpace
    },
    playerSprite: "shipC3.png",
    exhaustColor: rgb(0.4, 1, 0.4),
    exhaustOffsets: [
      vec2(-0.6, -1.0),
      vec2(-0.4, -1.1),
      vec2(-0.2, -1.2),
      vec2(0.2, -1.2),
      vec2(0.4, -1.1),
      vec2(0.6, -1.0),
    ],
  },
};

export const enemyBullet = {
  sheet: SPRITE_SHEET_NAME,
  sprite: "spaceMissiles_009.png",
  speed: 0.3,
  size: vec2(0.2, 0.2),
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
      name: "Shooter",
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_002.png",
      hp: 1,
      speed: 0.1,
      stopToFire: true,
      fireRate: 60,
      hitboxScale: 0.8,
      mirrorY: true,
    },
    type2: {
      name: "Tank",
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_005.png",
      hp: 5,
      speed: 0.05,
      hitboxScale: 0.8,
      mirrorY: true,
    },
    type3: {
      name: "Dive Bomber",
      sheet: SPRITE_SHEET_NAME,
      sprite: "spaceShips_001.png",
      hp: 3,
      speed: 0.2,
      diving: true,
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
  formations: {
    vShape: [
      vec2(0, 0),
      vec2(-1.5, 1.5),
      vec2(1.5, 1.5),
      vec2(-3, 3),
      vec2(3, 3),
    ],
    line: [vec2(-3, 0), vec2(-1.5, 0), vec2(0, 0), vec2(1.5, 0), vec2(3, 0)],
    single: [vec2(0, 0)],
  },
  paths: {
    enterAndStay: [vec2(0, -6)],
    zigZag: [vec2(-5, -5), vec2(5, -10), vec2(0, -15)],
    sweepLeft: [vec2(-8, -5), vec2(-8, -20)],
    sweepRight: [vec2(8, -5), vec2(8, -20)],
  },
};

export const boss = {
  sprite: "boss2.png",
  hp: 1000,
  speed: 0.05,
  size: vec2(8),
  color: rgb(1, 1, 1),
  novaRate: 180,
  fireLocations: [vec2(-1.5, 2), vec2(1.5, 2), vec2(-1.5, -1), vec2(1.5, -1)],
  hitboxScale: 0.8,
  mirrorY: true,
  regen: {
    baseTime: 20,
    timeStep: 2,
    minTime: 5,
    maxOrbiters: 7,
  },
};

export const beam = {
  rate: 600,
  duration: 180,
  endDuration: 30, // duration for shrinking at the end
  rotationSpeed: 0.007,
  count: 3,
  length: 60,
  width: 1.2,
};

export const orbiter = {
  sprite: "drone.png",
  baseHp: 20,
  maxHp: 100,
  hpCurve: 1.3,
  radius: 6,
  speed: 0.03,
  size: vec2(4),
  color: rgb(1, 1, 1),
  hitboxScale: 0.8,
  diveRate: 600,
  diveSpeed: 0.4,
  warningTime: 1.5, // seconds to blink before diving
  appearTime: 1.0, // seconds to blink into existence
};

export const orbiterLooter = {
  sprite: "drone-looter.png",
  baseHp: 20,
  maxHp: 100,
  hpCurve: 1.3,
  radius: 6,
  speed: 0.03,
  size: vec2(4),
  color: rgb(1, 1, 1),
  hitboxScale: 0.8,
  diveRate: 600,
  diveSpeed: 0.4,
  warningTime: 1.5, // seconds to blink before diving
  appearTime: 1.0, // seconds to blink into existence
};

export const shield = {
  sheet: "particles",
  sprite: "circle_01.png",
  radiusOffset: 2.4,
  pulseSpeed: 4,
  pulseMagnitude: 0.05,
  baseColor: rgb(0.2, 0.5, 1, 0.4),
  hitColor: rgb(0.8, 0.9, 1, 0.8),
  colorFadeSpeed: 0.1,
  bounceSpeed: 0.05,
  playerHitRadiusScale: 0.4,
  hitboxScale: 0.75, // accounts for transparency in the circle_01.png asset
  renderOrder: 1,
};

export const loot = {
  sheet: SPRITE_SHEET2_NAME,
  speed: 0.05,
  hitboxScale: 0.8,
  size: vec2(1, 1),
  mirrorY: true,
  types: {
    blue: { sprite: "powerupBlue_bolt.png", label: "Blue Bolt" },
    green: { sprite: "powerupGreen_bolt.png", label: "Green Bolt" },
    red: { sprite: "powerupRed_bolt.png", label: "Red Bolt" },
    star: { sprite: "powerupYellow_star.png", label: "Yellow Star" },
  },
};

export const settings = {
  musicEnabled: true,
  soundEffectsEnabled: true,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  enableDPSLog: false,
  customDebug: false,
  debugKey: "F1",
};

export const ui = {
  debugPos: vec2(1700, 64),
  debugSize: 30,
  debugColor: rgb(1, 0, 0),
};

export const strings = {
  ui: {
    title: "ALIEN ORBIT ASSAULT",
    subtitle: "ARCADE DEFENSE SYSTEM",
    controlsTitle: "CONTROLS",
    controlsBody:
      "WASD / ARROWS : MOVE\nSPACE : PRIMARY WEAPON\nSHIFT : FOCUS SPEED\nQ : SWITCH WEAPON",
    startPrompt: "PRESS ENTER TO BEGIN",
    playPrompt: "PRESS <KEY> TO PLAY",
    pauseTitle: "PAUSED",
    resumePrompt: "PRESS ESC TO RESUME",
    gameOverTitle: "MISSION FAILED",
    retryPrompt: "PRESS SPACE TO RETRY",
    settingsTitle: "SETTINGS",
    settingsPrompt: "PRESS [S] FOR SETTINGS",
    backPrompt: "PRESS [ESC] TO GO BACK",
    scorePrefix: "SCORE: ",
    timePrefix: "TIME: ",
    levelPrefix: "LVL ",
    lockedLabel: "LOCKED",
    sfxLabel: "SFX: ",
    musicLabel: "MUSIC: ",
    onLabel: "ON",
    offLabel: "OFF",
    sfxHotkey: " [S]",
    musicHotkey: " [M]",
  },
};

export const starfield = {
  count: 2000,
  speedBase: 5,
  speedRange: 7,
  verticalRange: 70,
  verticalOffset: 35,
  horizontalOffset: 9,
  sizeBase: 0.07,
  sizeRange: 0.11,
  alphaPower: 8,
};
