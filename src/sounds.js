import { Sound } from "../node_modules/littlejsengine/dist/littlejs.esm.js";

export class SoundGenerator extends Sound {
  constructor(params = {}) {
    const {
      volume = 1,
      randomness = 0.1,
      frequency = 220,
      attack = 0,
      release = 0.1,
      shapeCurve = 1,
      slide = 0,
      pitchJump = 0,
      pitchJumpTime = 0,
      repeatTime = 0,
      noise = 0,
      bitCrush = 0,
      delay = 0,
    } = params;

    super([
      volume,
      randomness,
      frequency,
      attack,
      0,
      release,
      0,
      shapeCurve,
      slide,
      0,
      pitchJump,
      pitchJumpTime,
      repeatTime,
      noise,
      0,
      bitCrush,
      delay,
      1,
      0,
      0,
      0,
    ]);
  }
}

/* eslint-disable no-sparse-arrays */
// Shoot 47
export const soundShoot = new Sound([
  0.2,
  ,
  165,
  0.02,
  0.13,
  0.08,
  5,
  1.8,
  20,
  23,
  ,
  ,
  ,
  ,
  ,
  ,
  0.07,
  0.88,
  0.06,
]);
/* eslint-enable no-sparse-arrays */
