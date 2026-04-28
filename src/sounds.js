import { Sound, SoundInstance, timeReal } from "./engine.js";
import { settings, system } from "./config.js";

// Keep track of which sounds are music to apply different volume settings
const musicSounds = new Set();

// Kind throttling for SFX: track last time each sound was played
const lastPlayTime = new Map();

// Global sound effect and volume control
const originalPlay = Sound.prototype.play;
Sound.prototype.play = function (
  pos,
  volume = 1,
  pitch = 1,
  randomPitch = 0,
  loop = false,
  paused,
) {
  const isMusic = musicSounds.has(this);
  if (system.isResetting && !isMusic) return;

  // Throttling: only play one instance of the same sound per frame
  if (!isMusic) {
    if (lastPlayTime.get(this) === timeReal) return;
    lastPlayTime.set(this, timeReal);
  }

  if (isMusic) {
    // Music uses musicVolume and musicEnabled toggle
    const vol = settings.musicEnabled ? volume * settings.musicVolume : 0;
    return originalPlay.call(this, pos, vol, pitch, randomPitch, loop, paused);
  } else {
    // SFX uses sfxVolume and soundEffectsEnabled toggle
    if (!settings.soundEffectsEnabled) return;
    return originalPlay.call(
      this,
      pos,
      volume * settings.sfxVolume,
      pitch,
      randomPitch,
      loop,
      paused,
    );
  }
};

// Also patch playMusic to automatically register music sounds
const originalPlayMusic = Sound.prototype.playMusic;
Sound.prototype.playMusic = function (volume, loop) {
  musicSounds.add(this);
  return originalPlayMusic.call(this, volume, loop);
};

// Also patch setVolume for active sound instances (like music)
const originalSetVolume = SoundInstance.prototype.setVolume;
SoundInstance.prototype.setVolume = function (volume) {
  const isMusic = musicSounds.has(this.sound);
  if (isMusic) {
    const vol = settings.musicEnabled ? volume * settings.musicVolume : 0;
    return originalSetVolume.call(this, vol);
  } else {
    return originalSetVolume.call(this, volume * settings.sfxVolume);
  }
};

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
// Vulcan — tight burst
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

// Latch beam — sustained electric hum with organic tremolo
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

// Shotgun — dry white-noise burst
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

/**
 * Play two sounds sequentially: nameSound first, then actionSound after
 * nameSound finishes (plus an optional gap in ms).
 * Uses the actual audio duration so the interval is always consistent
 * regardless of how long each weapon name is.
 * @param {Sound} nameSound
 * @param {Sound} actionSound
 * @param {number} [gapMs=120] - Extra silence after nameSound before actionSound
 */
export function playSequenced(nameSound, actionSound, gapMs = 100) {
  nameSound.play();
  const delaySec = nameSound.getDuration();
  // getDuration() returns 0 if not yet loaded; fall back to a safe default
  const delayMs = delaySec > 0 ? delaySec * 300 + gapMs : 400;
  setTimeout(() => actionSound.play(), delayMs);
}

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

// Register music sounds
musicSounds.add(soundBossMusic);
musicSounds.add(soundTitleMusic);
musicSounds.add(soundVictoryMusic);
musicSounds.add(soundGameOverMusic);
musicSounds.add(soundCreditsMusic);
