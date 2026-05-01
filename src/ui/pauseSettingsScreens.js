import {
  rgb,
  WHITE,
  Color,
  mouseWasReleased,
  timeReal,
} from "../engine.js";
import { GAME_STATES, settings, strings } from "../config/index.js";
import { saveSettings } from "../settings.js";
import { resetEconomy } from "../economy.js";
import { makeMenuRow, updateMenuInteraction, paintMenu } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
import {
  buildSharedSettingsSliders,
  buildSharedSettingsRows,
  buildSharedSettingsItems,
  updateSharedSliderInput,
} from "./settingsShared.js";

const FOCUS_COLOR = rgb(1, 0.9, 0.3);
const IDLE_COLOR = WHITE;

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
  const pauseGroup = makePanel(uiRoot, {
    color: new Color(0, 0, 0, 0.5),
  });

  makeCenterTitle(pauseGroup, -260, strings.ui.pauseTitle, {
    color: rgb(0.4, 0.7, 1),
  });

  const pauseSliders = buildSharedSettingsSliders(pauseGroup);
  const pauseMusicSlider = pauseSliders.music;
  const pauseSfxSlider = pauseSliders.sfx;
  const pauseMenuRows = buildSharedSettingsRows(pauseGroup, makeRow);

  // ── Settings screen ───────────────────────────────────────────────────────
  const settingsGroup = makePanel(uiRoot, {
    color: new Color(0.05, 0.05, 0.1, 0.9),
  });

  makeCenterTitle(settingsGroup, -260, strings.ui.settingsTitle, {
    color: rgb(1, 0.8, 0.2),
  });

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

    tick(gameState) {
      pauseGroup.visible = gameState === GAME_STATES.PAUSE;
      settingsGroup.visible = gameState === GAME_STATES.SETTINGS;
      if (pauseGroup.visible) {
        this.updatePause(pauseMenu, FOCUS_COLOR, IDLE_COLOR);
        this.processPausePointer(pauseMenu);
      }
      if (settingsGroup.visible) {
        this.updateSettings(settingsMenu, FOCUS_COLOR, IDLE_COLOR);
        this.processSettingsPointer(settingsMenu);
      }
    },
  };
}
