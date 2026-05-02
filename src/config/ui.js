import { vec2, rgb } from "../engine.js";

export const ui = {
  debugColor: rgb(1, 0, 0),
  debugPos: vec2(1700, 64),
  debugSize: 30,
  storyReveal: {
    titleCharInterval: 0.05,
    titleToBodyDelay: 0.35,
    bodyCharInterval: 0.018,
    bodyPartHoldDelay: 0.5,
    bodyWipeDuration: 0.45,
    bodyAfterWipeDelay: 0.15,
    promptDelay: 0.5,
    promptBlinkHz: 1.4,
    promptBlinkDutyCycle: 0.65,
  },
};
