import {
  vec2,
  rgb,
  UISlider,
  toggleFullscreen,
  isFullscreen,
} from "../engine.js";
import { soundShoot } from "../sounds.js";
import { settings, strings } from "../config/index.js";
import { saveSettings } from "../settings.js";
import { adjustSetting } from "../menuNav.js";

const SETTINGS_ROW_YS = [-180, -150, -80, -50, 30, 80, 130, 180];
const SETTINGS_MUSIC_SLIDER_Y = -120;
const SETTINGS_SFX_SLIDER_Y = -20;

export function buildSharedSettingsSliders(parent) {
  const music = new UISlider(
    vec2(0, SETTINGS_MUSIC_SLIDER_Y),
    vec2(380, 18),
    settings.musicVolume,
  );
  music.color = rgb(0.4, 0.7, 1);
  parent.addChild(music);

  const sfx = new UISlider(
    vec2(0, SETTINGS_SFX_SLIDER_Y),
    vec2(380, 18),
    settings.sfxVolume,
  );
  sfx.color = rgb(0.2, 1, 0.2);
  parent.addChild(sfx);

  return { music, sfx };
}

export function buildSharedSettingsRows(parent, makeMenuRow) {
  return SETTINGS_ROW_YS.map((y) => makeMenuRow(parent, y));
}

export function buildSharedSettingsItems({
  musicSlider,
  sfxSlider,
  syncVolumeSliders,
}) {
  return [
    {
      kind: "toggle",
      label: () =>
        `MUSIC: ${settings.musicEnabled ? strings.settings.onLabel : strings.settings.offLabel}`,
      toggle: () => {
        settings.musicEnabled = !settings.musicEnabled;
        syncVolumeSliders();
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `MUSIC VOLUME: ${Math.round(settings.musicVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "musicVolume", dir);
        musicSlider.value = settings.musicVolume;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SFX: ${settings.soundEffectsEnabled ? strings.settings.onLabel : strings.settings.offLabel}`,
      toggle: () => {
        settings.soundEffectsEnabled = !settings.soundEffectsEnabled;
        syncVolumeSliders();
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `SFX VOLUME: ${Math.round(settings.sfxVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "sfxVolume", dir);
        sfxSlider.value = settings.sfxVolume;
        soundShoot.play();
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `FLASH EFFECTS: ${settings.flashEnabled ? strings.settings.onLabel : strings.settings.offLabel}`,
      toggle: () => {
        settings.flashEnabled = !settings.flashEnabled;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SCREEN SHAKE: ${settings.shakeEnabled ? strings.settings.onLabel : strings.settings.offLabel}`,
      toggle: () => {
        settings.shakeEnabled = !settings.shakeEnabled;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `FULLSCREEN: ${isFullscreen() ? strings.settings.onLabel : strings.settings.offLabel}`,
      toggle: () => toggleFullscreen(),
    },
  ];
}

export function updateSharedSliderInput(musicSlider, sfxSlider) {
  if (!settings.musicEnabled) {
    musicSlider.value = 0;
  } else if (musicSlider.value !== settings.musicVolume) {
    settings.musicVolume = musicSlider.value;
  }

  if (!settings.soundEffectsEnabled) {
    sfxSlider.value = 0;
  } else if (sfxSlider.value !== settings.sfxVolume) {
    settings.sfxVolume = sfxSlider.value;
    soundShoot.play();
  }
}
