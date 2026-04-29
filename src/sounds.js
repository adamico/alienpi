import { Sound, SoundInstance, timeReal } from "./engine.js";
import { settings, system } from "./config.js";

// Keep track of which sounds are music to apply different volume settings
const musicSounds = new Set();

// Kind throttling for SFX: track last time each sound was played
const lastPlayTime = new Map();

// Track all active sound instances for realtime volume updates
const activeInstances = new Set();

// Global sound effect and volume control
const originalPlay = Sound.prototype.play;
Sound.prototype.play = function (
  pos,
  volume = 1,
  pitch = 1,
  // LittleJS's default is 1 (full per-play pitch jitter from the sound's
  // stored randomness). Don't override to 0 — that silently kills variation.
  randomnessScale = 1,
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
    const instance = originalPlay.call(
      this,
      pos,
      volume,
      pitch,
      randomnessScale,
      loop,
      paused,
    );
    if (instance) {
      musicSounds.add(this); // Ensure it's marked as music
      activeInstances.add(instance);
      instance.setVolume(instance.volume); // Apply initial volume scaling
    }
    return instance;
  } else {
    // SFX uses sfxVolume and soundEffectsEnabled toggle
    const instance = originalPlay.call(
      this,
      pos,
      volume,
      pitch,
      randomnessScale,
      loop,
      paused,
    );
    if (instance) {
      activeInstances.add(instance);
      instance.setVolume(instance.volume); // Apply initial volume scaling
    }
    return instance;
  }
};

// Also patch playMusic to automatically register music sounds
const originalPlayMusic = Sound.prototype.playMusic;
Sound.prototype.playMusic = function (volume, loop) {
  musicSounds.add(this);
  return originalPlayMusic.call(this, volume, loop);
};

// Also patch setVolume for active sound instances (like music)
SoundInstance.prototype.setVolume = function (volume) {
  this.volume = volume; // Keep the requested volume unscaled
  if (!this.gainNode) return;

  const isMusic = musicSounds.has(this.sound);
  let vol = volume;

  if (isMusic) {
    vol *= settings.musicEnabled ? settings.musicVolume : 0;
  } else {
    vol *= settings.soundEffectsEnabled ? settings.sfxVolume : 0;
  }

  // Directly set the gain node value to avoid recursion if we called originalSetVolume
  this.gainNode.gain.value = vol;
};

/**
 * Updates all active sound instances to reflect current volume settings.
 * Should be called every frame from the main game loop.
 */
export function updateSoundVolumes() {
  for (const instance of activeInstances) {
    if (!instance.isPlaying()) {
      activeInstances.delete(instance);
      continue;
    }
    // Re-apply current volume settings to the instance
    instance.setVolume(instance.volume);
  }
}

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
/* eslint-enable no-sparse-arrays */

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
/* eslint-disable no-sparse-arrays */
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
/* eslint-enable no-sparse-arrays */

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
