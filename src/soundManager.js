import { soundTitleMusic, updateSoundVolumes } from "./sounds.js";

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
      activeMusicInstance = desired.playMusic(1.0, true);
    }
  } else if (!activeMusicInstance && desired && desired.isLoaded()) {
    // Track was selected before its file finished loading; start now.
    activeMusicInstance = desired.playMusic(1.0, true);
  }

  updateSoundVolumes();
}
