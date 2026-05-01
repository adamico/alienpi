import { vec2, rgb } from "../../engine.js";

export const boss = {
  color: rgb(1, 1, 1),
  fireLocations: [vec2(-1.5, 2), vec2(1.5, 2), vec2(-1.5, -1), vec2(1.5, -1)],
  hitboxScale: 0.8,
  hp: 650,
  mirrorY: true,
  novaRate: 180,
  regen: {
    baseTime: 20,
    timeStep: 2,
    minTime: 5,
    maxOrbiters: 7,
  },
  size: vec2(8),
  speed: 0.05,
  sprite: "boss2.png",
};

export const beam = {
  count: 3,
  duration: 180,
  endDuration: 30, // duration for shrinking at the end
  length: 60,
  rate: 600,
  rotationSpeed: 0.007,
  width: 1.2,
};

export const orbiter = {
  appearTime: 1.0, // seconds to blink into existence
  baseHp: 20,
  color: rgb(1, 1, 1),
  diveRate: 600,
  diveSpeed: 0.4,
  hitboxScale: 0.8,
  hpCurve: 1.3,
  maxHp: 100,
  radius: 6,
  size: vec2(4),
  speed: 0.03,
  sprite: "drone.png",
  warningTime: 1.5, // seconds to blink before diving
};

export const orbiterLooter = {
  appearTime: 1.0, // seconds to blink into existence
  baseHp: 20,
  color: rgb(1, 1, 1),
  diveRate: 600,
  diveSpeed: 0.4,
  hitboxScale: 0.8,
  hpCurve: 1.3,
  maxHp: 100,
  radius: 6,
  size: vec2(4),
  speed: 0.03,
  sprite: "drone-looter.png",
  warningTime: 1.5, // seconds to blink before diving
};

export const shield = {
  baseColor: rgb(0.2, 0.5, 1, 0.4),
  bounceSpeed: 0.05,
  colorFadeSpeed: 0.1,
  hitboxScale: 0.75, // accounts for transparency in the circle_01.png asset
  hitColor: rgb(0.8, 0.9, 1, 0.8),
  playerHitRadiusScale: 0.4,
  pulseMagnitude: 0.05,
  pulseSpeed: 4,
  radiusOffset: 2.4,
  renderOrder: 1,
  sheet: "particles",
  sprite: "circle_01.png",
};
