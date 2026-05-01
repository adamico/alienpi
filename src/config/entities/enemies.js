import { vec2, PI } from "../../engine.js";
import { SPRITE_SHEET_NAME } from "../constants.js";

export const missile = {
  ejectDuration: 0.3, // seconds of uncapped coast before homing kicks in
  fanHalfAngleBase: PI / 6, // half-angle of rear fan at stage 0
  fanHalfAngleStageBonus: PI / 24, // extra half-angle per stage
  hitboxScale: 0.7,
  homingStrength: 0.008, // acceleration toward player each frame
  hp: 2,
  lifetime: 6, // seconds before missile detonates
  mirrorY: true,
  repelRadius: 1.5, // neighbour distance for inter-missile repulsion
  repelStrength: 0.012, // peak per-frame repel acceleration
  sheet: "",
  size: vec2(2, 2),
  spawnLateralJitter: 0.25, // per-missile x offset at spawn
  speed: 0.1,
  sprite: "homing2.png",
  volleys: 3, // nova pulses between each missile salvo
};

export const enemy = {
  swarm: {
    type1: {
      fireRate: 60,
      hitboxScale: 0.8,
      hp: 1,
      mirrorY: true,
      name: "Shooter",
      sheet: SPRITE_SHEET_NAME,
      speed: 0.1,
      sprite: "spaceShips_002.png",
      stopToFire: true,
    },
    type2: {
      hitboxScale: 0.8,
      hp: 5,
      mirrorY: true,
      name: "Tank",
      sheet: SPRITE_SHEET_NAME,
      speed: 0.05,
      sprite: "spaceShips_005.png",
    },
    type3: {
      diving: true,
      hitboxScale: 0.8,
      hp: 3,
      mirrorY: true,
      name: "Dive Bomber",
      sheet: SPRITE_SHEET_NAME,
      speed: 0.2,
      sprite: "spaceShips_001.png",
    },
  },
  flocking: {
    alignment: 0.02,
    cohesion: 0.01,
    playerAttraction: 0.005,
    separation: 0.05,
  },
  formations: {
    line: [vec2(-3, 0), vec2(-1.5, 0), vec2(0, 0), vec2(1.5, 0), vec2(3, 0)],
    single: [vec2(0, 0)],
    vShape: [
      vec2(0, 0),
      vec2(-1.5, 1.5),
      vec2(1.5, 1.5),
      vec2(-3, 3),
      vec2(3, 3),
    ],
  },
  paths: {
    enterAndStay: [vec2(0, -6)],
    sweepLeft: [vec2(-8, -5), vec2(-8, -20)],
    sweepRight: [vec2(8, -5), vec2(8, -20)],
    zigZag: [vec2(-5, -5), vec2(5, -10), vec2(0, -15)],
  },
};
