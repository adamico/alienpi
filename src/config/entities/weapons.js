import { vec2, rgb, PI } from "../../engine.js";

const VULCAN_BASE_DAMAGE = 0.3;
const VULCAN_BASE_SPEED = 0.4;
const VULCAN_DAMAGE_STEP = 0.1;
const vulcanBullet = {
  despawnRadius: 0.5,
  hitboxScale: 1.0,
  mirrorY: true,
  sheet: "",
  size: vec2(0.5, 0.5),
  speed: VULCAN_BASE_SPEED,
  sprite: "shipA_bullets.png",
  squishHz: 15,
  squishScale: 0.4,
  trailLength: 5,
};

const shotgunBullet = {
  animFps: 24,
  animFrames: 8,
  animFrameSize: vec2(32, 64),
  despawnRadius: 0.5,
  hitboxScale: 0.25,
  mirrorY: true,
  renderOrder: 1,
  sheet: "",
  size: vec2(1.0, 1.0),
  speed: [VULCAN_BASE_SPEED, VULCAN_BASE_SPEED * 1.25, VULCAN_BASE_SPEED * 1.5],
  sprite: "shipB_bullets.png",
  trailLength: 3,
};

export const weapons = {
  vulcan: {
    bullet: vulcanBullet,
    bulletCount: [1, 2, 3],
    damage: [
      VULCAN_BASE_DAMAGE,
      VULCAN_BASE_DAMAGE + VULCAN_DAMAGE_STEP,
      VULCAN_BASE_DAMAGE + VULCAN_DAMAGE_STEP * 2,
    ],
    fireRate: [8, 6, 5],
    exhaustColor: rgb(0.4, 1, 1),
    exhaustOffsets: [vec2(-0.2, -1.2), vec2(0.2, -1.2)],
    label: "VULCAN",
    muzzleForwardOffset: 1,
    muzzleSpacing: 0.5,
    muzzleAlpha: 1.0,
    muzzleColor: rgb(0.4, 1, 1),
    muzzleDuration: 0.15,
    muzzleSprite: "muzzle_05.png",
    pierce: [1, 2, 3],
    playerSprite: "shipA3.png",
  },
  shotgun: {
    bullet: shotgunBullet,
    coneBase: (40 * PI) / 180,
    coneMax: (80 * PI) / 180,
    coneMin: (16 * PI) / 180,
    bulletCount: [5, 7, 9],
    closeRangeCooldown: [10, 10, 10],
    closeRangeThreshold: 6,
    damage: [0.2, 0.4, 0.6],
    exhaustColor: rgb(1, 0.5, 0.2),
    exhaustOffsets: [vec2(0, -1.3)],
    label: "SHOTGUN",
    muzzleAlpha: 1.0,
    muzzleColor: rgb(1, 1, 1),
    muzzleDuration: 0.25,
    muzzleOffsets: [
      [vec2(0, 0)], // Level 1
      [vec2(0, 0)], // Level 2
      [vec2(0, 0)], // Level 3
    ],
    muzzleSprite: "muzzle_05.png",
    playerSprite: "shipB2.png",
  },
  latch: {
    beamSparks: {
      colorEndA: rgb(0, 1, 0.1, 0),
      colorEndB: rgb(0, 0.6, 0.05, 0),
      colorStartA: rgb(0, 1, 0.5, 1),
      colorStartB: rgb(0, 1, 0.2, 1),
      emitRate: 300,
      emitSize: 0.05,
      emitTime: 0.05,
      particleTime: 0.25,
      sizeEnd: 0.2,
      sizeStart: 1.18,
      spawnChance: 0.6,
      speed: 0.06,
      sprites: ["spark_01.png", "spark_02.png", "spark_03.png", "spark_04.png"],
    },
    color: rgb(0.4, 1, 0.4, 0.9),
    cooldown: [40, 32, 24], // frames between damage ticks per beam
    count: [3, 5, 7], // max simultaneous beams
    damage: [0.75, 1, 1.25], // fixed damage at all levels
    exhaustColor: rgb(0.4, 1, 0.4),
    exhaustOffsets: [
      vec2(-0.6, -1.0),
      vec2(-0.4, -1.1),
      vec2(-0.2, -1.2),
      vec2(0.2, -1.2),
      vec2(0.4, -1.1),
      vec2(0.6, -1.0),
    ],
    fanCone: (60 * PI) / 180,
    label: "BEAM",
    latchPoint: {
      sizeStart: 2.4,
      sizeEnd: 0.1,
      particleTime: 0.2,
      emitRate: 40,
      color: rgb(0.4, 1, 0.4),
      alpha: 1.0,
    },
    lineWidth: 0.2,
    muzzleAlpha: 0.8,
    muzzleColor: rgb(0.4, 1, 0.4, 0.9),
    muzzleDuration: 0.2,
    muzzleOffsets: [
      [vec2(0, 0)], // Level 1
      [vec2(0, 0)], // Level 2
      [vec2(0, 0)], // Level 3
    ],
    muzzleRate: 30,
    muzzleSize: 0.8,
    muzzleSprite: "star_09.png",
    playerSprite: "shipC3.png",
    range: [16, 16, 16], // max lock distance in world units
    renderOrder: 10,
    sparks: {
      colorEndA: rgb(0, 1, 0.1, 0),
      colorEndB: rgb(0, 0.6, 0.05, 0),
      colorStartA: rgb(0, 1, 0.5, 1),
      colorStartB: rgb(0, 1, 0.2, 1),
      emitRate: 80,
      emitSize: 0.15,
      emitTime: 0.08,
      particleTime: 0.35,
      sizeEnd: 0.05,
      sizeStart: 0.35,
      speed: 0.12,
      sprites: ["spark_01.png", "spark_02.png", "spark_03.png", "spark_04.png"],
    },
  },
};
