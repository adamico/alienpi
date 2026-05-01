import {
  vec2,
  rgb,
  UIObject,
  UIText,
  Color,
  mainCanvasSize,
  mouseWasReleased,
  timeReal,
} from "../engine.js";
import { settings, saveSettings, strings } from "../config.js";
import { resetEconomy } from "../economy.js";
import { FONT_MENU } from "../fonts.js";
import { makeMenuRow, updateMenuInteraction, paintMenu } from "./menuView.js";
import {
  buildSharedSettingsSliders,
  buildSharedSettingsRows,
  buildSharedSettingsItems,
  updateSharedSliderInput,
} from "./settingsShared.js";

/**
 * Creates the pause overlay and settings screen, sharing a common
 * syncVolumeSliders closure that keeps all four sliders in sync.
 *
 * Returns an object with:
 *   pauseGroup, settingsGroup  — UIObject roots
 *   pauseMenuRows, settingsMenuRows — row arrays for menu painting
 *   pauseMusicSlider, pauseSfxSlider,
 *   settingsMusicSlider, settingsSfxSlider — slider refs (for rebuildMenus)
 *   syncVolumeSliders() — syncs all four sliders to current settings
 *   updatePause(menu, focusColor, idleColor)
 *   updateSettings(menu, focusColor, idleColor)
 *   processPausePointer(menu)
 *   processSettingsPointer(menu)
 */
export function createPauseSettingsScreens(uiRoot, pauseMenu, settingsMenu, handlers) {
  function makeRow(parent, y, h = 40) {
    return makeMenuRow(parent, y, h);
  }

  // ── Pause screen ─────────────────────────────────────────────────────────
  const pauseGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  pauseGroup.color = new Color(0, 0, 0, 0.5);
  pauseGroup.lineWidth = 0;
  uiRoot.addChild(pauseGroup);

  const pauseTitleText = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.pauseTitle,
  );
  pauseTitleText.textHeight = 70;
  pauseTitleText.font = FONT_MENU;
  pauseTitleText.fontShadow = true;
  pauseTitleText.textColor = rgb(0.4, 0.7, 1);
  pauseGroup.addChild(pauseTitleText);

  const pauseSliders = buildSharedSettingsSliders(pauseGroup);
  const pauseMusicSlider = pauseSliders.music;
  const pauseSfxSlider = pauseSliders.sfx;
  const pauseMenuRows = buildSharedSettingsRows(pauseGroup, makeRow);

  // ── Settings screen ───────────────────────────────────────────────────────
  const settingsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  settingsGroup.color = new Color(0.05, 0.05, 0.1, 0.9);
  settingsGroup.lineWidth = 0;
  uiRoot.addChild(settingsGroup);

  const settingsTitle = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.settingsTitle,
  );
  settingsTitle.textHeight = 70;
  settingsTitle.font = FONT_MENU;
  settingsTitle.fontShadow = true;
  settingsTitle.textColor = rgb(1, 0.8, 0.2);
  settingsGroup.addChild(settingsTitle);

  const settingsSliders = buildSharedSettingsSliders(settingsGroup);
  const settingsMusicSlider = settingsSliders.music;
  const settingsSfxSlider = settingsSliders.sfx;
  const settingsMenuRows = buildSharedSettingsRows(settingsGroup, makeRow);
  // Extra row for the "RESET PROGRESS" item — only the settings menu uses it.
  settingsMenuRows.push(makeRow(settingsGroup, 220));

  // ── Shared sync ───────────────────────────────────────────────────────────
  function syncVolumeSliders() {
    const music = settings.musicEnabled ? settings.musicVolume : 0;
    const sfx = settings.soundEffectsEnabled ? settings.sfxVolume : 0;
    if (pauseMusicSlider) pauseMusicSlider.value = music;
    if (pauseSfxSlider) pauseSfxSlider.value = sfx;
    if (settingsMusicSlider) settingsMusicSlider.value = music;
    if (settingsSfxSlider) settingsSfxSlider.value = sfx;
  }

  // ── Menu wiring ───────────────────────────────────────────────────────────
  const pauseSharedItems = buildSharedSettingsItems({
    musicSlider: pauseMusicSlider,
    sfxSlider: pauseSfxSlider,
    syncVolumeSliders,
  });
  pauseMenu.setItems([
    ...pauseSharedItems,
    {
      kind: "action",
      label: () => "BACK TO GAME (ESC)",
      activate: () => handlers.resume(),
    },
  ]);

  const settingsSharedItems = buildSharedSettingsItems({
    musicSlider: settingsMusicSlider,
    sfxSlider: settingsSfxSlider,
    syncVolumeSliders,
  });
  let resetArmedUntil = 0;
  settingsMenu.setItems([
    ...settingsSharedItems,
    {
      kind: "action",
      label: () =>
        timeReal < resetArmedUntil
          ? "PRESS AGAIN TO CONFIRM"
          : "RESET PROGRESS",
      activate: () => {
        if (timeReal < resetArmedUntil) {
          resetEconomy();
          resetArmedUntil = 0;
        } else {
          resetArmedUntil = timeReal + 3;
        }
      },
    },
    {
      kind: "action",
      label: () => "BACK",
      activate: () => handlers.back(),
    },
  ]);

  return {
    pauseGroup,
    settingsGroup,

    updatePause(menu, focusColor, idleColor) {
      updateSharedSliderInput(pauseMusicSlider, pauseSfxSlider);
      paintMenu(menu, pauseMenuRows, focusColor, idleColor);
    },

    updateSettings(menu, focusColor, idleColor) {
      updateSharedSliderInput(settingsMusicSlider, settingsSfxSlider);
      paintMenu(menu, settingsMenuRows, focusColor, idleColor);
    },

    processPausePointer(menu) {
      updateMenuInteraction(menu, pauseMenuRows);
      if (
        mouseWasReleased(0) &&
        (pauseMusicSlider.isHoverObject() || pauseSfxSlider.isHoverObject())
      ) {
        saveSettings();
      }
    },

    processSettingsPointer(menu) {
      updateMenuInteraction(menu, settingsMenuRows);
      if (
        mouseWasReleased(0) &&
        (settingsMusicSlider.isHoverObject() ||
          settingsSfxSlider.isHoverObject())
      ) {
        saveSettings();
      }
    },
  };
}
