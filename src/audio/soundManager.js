import { Sound, timeReal } from "../engine.js";
import { settings, system } from "../config/index.js";
import {
  soundTitleMusic,
  soundBossMusic,
  soundVictoryMusic,
  soundGameOverMusic,
  soundCreditsMusic,
} from "./sounds.js";

// Keep track of which sounds are music to apply different volume settings.
const musicSounds = new Set([
  soundTitleMusic,
  soundBossMusic,
  soundVictoryMusic,
  soundGameOverMusic,
  soundCreditsMusic,
]);

// Kind throttling for SFX: track last time each sound was played.
const lastPlayTime = new Map();

// Track all active sound instances and their base playback settings.
const activeInstances = new Set();
const instanceMeta = new WeakMap();

function scaleVolume(baseVolume, isMusic) {
  if (isMusic) {
    return baseVolume * (settings.musicEnabled ? settings.musicVolume : 0);
  }
  return baseVolume * (settings.soundEffectsEnabled ? settings.sfxVolume : 0);
}

function trackInstance(instance, isMusic, baseVolume) {
  if (!instance) return null;
  activeInstances.add(instance);
  instanceMeta.set(instance, { isMusic, baseVolume });
  instance.setVolume(scaleVolume(baseVolume, isMusic));
  return instance;
}

export function playSfx(
  sound,
  pos,
  volume = 1,
  pitch = 1,
  // LittleJS's default is 1 (full per-play pitch jitter from the sound's
  // stored randomness). Don't override to 0 — that silently kills variation.
  randomnessScale = 1,
  loop = false,
  paused,
) {
  if (system.isResetting) return null;

  // Throttling: only play one instance of the same sound per frame.
  if (lastPlayTime.get(sound) === timeReal) return null;
  lastPlayTime.set(sound, timeReal);

  const instance = sound.play(
    pos,
    volume,
    pitch,
    randomnessScale,
    loop,
    paused,
  );
  return trackInstance(instance, false, volume);
}

export function playMusicManaged(sound, volume = 1, loop = true) {
  musicSounds.add(sound);
  const instance = sound.playMusic(volume, loop);
  return trackInstance(instance, true, volume);
}

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
    const meta = instanceMeta.get(instance);
    if (!meta) continue;
    instance.setVolume(scaleVolume(meta.baseVolume, meta.isMusic));
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
  playSfx(nameSound);
  const delaySec = nameSound.getDuration();
  // getDuration() returns 0 if not yet loaded; fall back to a safe default.
  const delayMs = delaySec > 0 ? delaySec * 300 + gapMs : 400;
  setTimeout(() => playSfx(actionSound), delayMs);
}

let activeMusicSound = null;
let activeMusicInstance = null;
let desiredMusicSound = soundTitleMusic;

/**
 * Set the desired music track. Pass null to keep whatever is currently playing.
 * @param {Sound|null} track
 */
export function setDesiredMusic(track) {
  if (track != null) {
    desiredMusicSound = track;
  }
}

/**
 * Drive music transitions and sync all sound volumes. Call once per frame.
 */
export function updateAudio() {
  const desired = desiredMusicSound;
  if (desired !== activeMusicSound) {
    if (activeMusicInstance) {
      activeMusicInstance.stop();
      activeMusicInstance = null;
    }
    activeMusicSound = desired;
    if (desired && desired.isLoaded()) {
      activeMusicInstance = playMusicManaged(desired, 1.0, true);
    }
  } else if (!activeMusicInstance && desired && desired.isLoaded()) {
    // Track was selected before its file finished loading; start now.
    activeMusicInstance = playMusicManaged(desired, 1.0, true);
  }

  updateSoundVolumes();
}
