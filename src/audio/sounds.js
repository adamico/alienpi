/* eslint-disable no-sparse-arrays */

import { Sound } from "../engine.js";

// Vulcan — tight burst. Index 1 = per-play pitch randomness (LittleJS strips
// it from the array at construction and applies it as a per-play jitter).
export const soundShoot = new Sound([
  0.2,
  0.08,
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

// Latch beam — sustained electric hum with organic tremolo. Longer release
// than damage tick rate so consecutive plays overlap into a continuous hum
// rather than re-attacking each cycle.
export const soundLatch = new Sound([
  0.18,
  0.04,
  140,
  0.03,
  0.3,
  0.45,
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
  0.2,
  0.8,
  ,
  0.15,
  ,
]);

// Latch beam charge-up — brief rising blip played once when the player starts
// firing the beam, mirrors the boss beam treatment but lighter and brighter.
export const soundLatchCharge = new Sound([
  0.5,
  0,
  240,
  0.04,
  0.18,
  0.05,
  1,
  1.4,
  8,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  0.2,
  0.7,
  0.04,
]);

// Shotgun — punchy noise burst with a deeper body and longer tail. Earlier
// version sat too quiet next to the impacts it caused.
export const soundShotgun = new Sound([
  0.6,
  0.08,
  220,
  0.005,
  0.06,
  0.18,
  4,
  1.6,
  ,
  -55,
  ,
  ,
  ,
  2.5,
  4,
  0.25,
  0.25,
  0.7,
  0.1,
]);

// Explosion — boomier low-end and longer tail; previous mix was thin.
export const soundExplosion1 = new Sound([
  0.8,
  0.05,
  45,
  0.05,
  ,
  0.7,
  4,
  2.9,
  ,
  6.9,
  -50,
  ,
  0.01,
  0.6,
  ,
  0.6,
  0.35,
  0.45,
  0.18,
  ,
  4,
]);

export const soundExplosion2 = new Sound([
  1.6,
  0.05,
  28,
  0.03,
  0.05,
  0.25,
  5,
  1.545843234053468,
  ,
  6,
  ,
  ,
  ,
  2.2,
  ,
  0.4,
  0.15,
  0.45,
  0.08,
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

// Boss beam — sustained low drone with tremolo + slight delay tail. The long
// release lets retriggers overlap smoothly into a continuous hum instead of
// the previous machine-gun-like pulsing.
export const soundBossBeam = new Sound([
  1.6,
  0.05,
  110,
  0.04,
  0.35,
  0.5,
  2,
  1.4,
  ,
  ,
  ,
  ,
  ,
  ,
  6,
  ,
  0.25,
  0.7,
  0.08,
]);

// Boss beam charge-up — rising whine played once during the starting telegraph.
export const soundBossBeamCharge = new Sound([
  0.9,
  0.02,
  90,
  0.05,
  0.4,
  0.05,
  1,
  1.5,
  6,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  0.3,
  0.6,
  0.05,
]);

// Score ping — brief chime played on kill score popups; caller varies pitch
// per tier (small/medium/large kill) to give kills a distinct audio signature.
export const soundScorePing = new Sound([
  0.3,
  0,
  700,
  0.005,
  0.04,
  0.18,
  0,
  2.0,
  8,
  ,
  120,
  0.04,
  ,
  ,
  ,
  ,
  0.2,
  0.65,
  0.04,
]);

// Stat reveal — soft warm chime played as each post-run stat counts up.
export const soundStatReveal = new Sound([
  0.25,
  0,
  520,
  0.005,
  0.04,
  0.25,
  1,
  1.3,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  0.15,
  0.7,
  0.04,
]);

// Loot collect — bright, rising chime
export const soundLootCollect = new Sound([
  0.5,
  ,
  880,
  0.01,
  0.08,
  0.1,
  0,
  2.5,
  15,
  ,
  200,
  0.05,
  ,
  ,
  ,
  ,
  0.3,
  0.7,
  0.05,
]); // Pickup chime

// Weapon unlock — ascending power-up sting
export const soundWeaponUnlock = new Sound("public/assets/sounds/unlocked.mp3");

// Weapon upgrade — mid chime, shorter than unlock
export const soundWeaponUpgrade = new Sound(
  "public/assets/sounds/upgraded.mp3",
);

// Weapon max — bright fanfare hit
export const soundWeaponMax = new Sound("public/assets/sounds/maxed.mp3");

// Weapon switch — quick neutral blip
export const soundWeaponSwitch = new Sound([
  0.3,
  ,
  440,
  0.005,
  0.04,
  0.06,
  0,
  1.2,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  0.15,
  0.6,
  0.03,
]); // Switch

export const soundGameOverJingle = new Sound([
  1.4,
  ,
  65.40639,
  ,
  0.7,
  0.7,
  3,
  1.7,
  -0.05,
  ,
  ,
  ,
  ,
  0.1,
  ,
  ,
  0.08,
  0.7,
  1,
  0.04,
  1,
]); // Music 510

// Spoken weapon names — played alongside unlock/max feedback sounds
export const soundNameVulcan = new Sound("public/assets/sounds/vulcan.mp3");
export const soundNameShotgun = new Sound("public/assets/sounds/shotgun.mp3");
export const soundNameBeam = new Sound("public/assets/sounds/beam.mp3");

// Map weapon key → spoken name sound for easy lookup in player.js
export const weaponNameSounds = {
  vulcan: soundNameVulcan,
  shotgun: soundNameShotgun,
  latch: soundNameBeam,
};

export const soundBossMusic = new Sound(
  "public/assets/sounds/gameplay-music.mp3",
);
export const soundTitleMusic = new Sound(
  "public/assets/sounds/title-music.mp3",
);
export const soundVictoryMusic = new Sound(
  "public/assets/sounds/victory-music.mp3",
);
export const soundGameOverMusic = new Sound(
  "public/assets/sounds/gameover-music.mp3",
);
export const soundCreditsMusic = new Sound(
  "public/assets/sounds/credits-music.mp3",
);
