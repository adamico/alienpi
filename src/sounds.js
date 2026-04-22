import { Sound } from "./engine.js";

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

// Latch beam — sustained electric hum with organic tremolo. Loopable: total
// envelope ≈ 0.28s, retriggered by Player every ~15 frames while firing.
export const soundLatch = new Sound([
  0.15,
  0.0,
  120,
  0.02,
  0.25,
  0.02,
  2,
  1.5,
  ,
  ,
  ,
  ,
  ,
  0.3,
  80,
  0.08,
  0.1,
  0.8,
  ,
  0.2,
  ,
]);

// Shotgun — dry white-noise burst with a quick pitch-drop thump for the
// spread blast feel.
export const soundShotgun = new Sound([
  1.3,
  0.01,
  351,
  ,
  0.09,
  0.08,
  1,
  4,
  ,
  -31,
  ,
  ,
  ,
  1.7,
  5,
  0.2,
  0.14,
  0.61,
  0.05,
]); // Shoot 420 - Copy 3
/* eslint-enable no-sparse-arrays */

export const soundExplosion1 = new Sound([
  0.8,
  ,
  55,
  0.07,
  ,
  0.53,
  4,
  2.9,
  ,
  6.9,
  -50,
  ,
  0.01,
  0.5,
  ,
  0.5,
  0.24,
  0.42,
  0.14,
  ,
  4,
]); // Explosion 444 - Mutation 4

export const soundExplosion2 = new Sound([
  0.8,
  ,
  31,
  0.03,
  0.04,
  0,
  5,
  1.545843234053468,
  ,
  6,
  ,
  ,
  ,
  1.9,
  ,
  0.3,
  ,
  0.35,
  0.05,
]); // Explosion 457

export const soundPlayerHit = new Sound([
  0.8,
  ,
  80,
  0.01,
  0.05,
  0.19,
  5,
  0.8261122666996943,
  ,
  ,
  ,
  ,
  ,
  2,
  2.3,
  0.2,
  ,
  0.93,
  0.02,
]); // Hit 483

export const soundBossBeam = new Sound([
  1.9,
  ,
  208,
  0.01,
  0.17,
  0.09,
  1,
  2.2,
  ,
  2,
  ,
  ,
  ,
  ,
  2.4,
  ,
  0.17,
  0.74,
  0.08,
]); // Shoot 475

export const soundBossMusic = new Sound(
  "public/assets/sounds/Lasermelon%20Boss.mp3",
);
export const soundMusicIntro = new Sound("public/assets/sounds/Intro.wav");
export const soundMusicVerse = new Sound("public/assets/sounds/VerseA.wav");
