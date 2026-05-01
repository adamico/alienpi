import {
  rgb,
  WHITE,
  UISystemPlugin,
  uiSystem,
  UIObject,
  timeReal,
  mainCanvasSize,
  Color,
} from "./engine.js";

import { GAME_STATES } from "./config.js";
import { Menu } from "./menuNav.js";
import { resetEconomy } from "./economy.js";
import { buildSharedSettingsItems } from "./ui/settingsShared.js";
import { createPauseSettingsScreens } from "./ui/pauseSettingsScreens.js";
import { createLoreScreen, createCreditsScreen } from "./ui/storyScreens.js";
import { createHudView } from "./ui/hudView.js";
import { createEconomyScreens } from "./ui/economyScreens.js";
import { createTitleScreen } from "./ui/titleScreen.js";

let uiStateProvider = null;

let uiRoot;
let hudView;
let economyScreens;
let titleView;
let pauseSettingsView;
let loreView;
let creditsView;
let hudGroup,
  titleGroup,
  pauseGroup,
  gameOverGroup,
  preRunGroup,
  settingsGroup;

const FOCUS_COLOR = rgb(1, 0.9, 0.3);
const IDLE_COLOR = WHITE;

export const titleMenu = new Menu();
export const pauseMenu = new Menu();
export const settingsMenu = new Menu();

// Menu action callbacks are wired in by game.js so ui.js stays free of state mutation.
let titleHandlers = {
  start: () => {},
  openSettings: () => {},
  openCredits: () => {},
};
let creditsHandlers = {
  back: () => {},
};
let pauseHandlers = {
  resume: () => {},
};
let settingsHandlers = {
  back: () => {},
};
let loreHandlers = {
  start: () => {},
};

export function setMenuHandlers({
  title,
  pause,
  settings: settingsH,
  credits,
  lore,
}) {
  if (title) titleHandlers = { ...titleHandlers, ...title };
  if (pause) pauseHandlers = { ...pauseHandlers, ...pause };
  if (settingsH) settingsHandlers = { ...settingsHandlers, ...settingsH };
  if (credits) creditsHandlers = { ...creditsHandlers, ...credits };
  if (lore) loreHandlers = { ...loreHandlers, ...lore };
}

export function initUI({ getUIState }) {
  uiStateProvider = getUIState;
  new UISystemPlugin();
  uiSystem.nativeHeight = 0;

  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  // HUD
  hudView = createHudView(uiRoot);
  hudGroup = hudView.root;

  titleView = createTitleScreen(uiRoot);
  titleGroup = titleView.root;
  pauseSettingsView = createPauseSettingsScreens(uiRoot);
  pauseGroup = pauseSettingsView.pauseGroup;
  settingsGroup = pauseSettingsView.settingsGroup;
  creditsView = createCreditsScreen(uiRoot);
  loreView = createLoreScreen(uiRoot);
  economyScreens = createEconomyScreens(uiRoot);
  preRunGroup = economyScreens.homeGroup;
  gameOverGroup = economyScreens.postRunGroup;
  rebuildMenus();
}

function rebuildMenus() {
  titleMenu.setItems([
    {
      kind: "action",
      label: () => "START",
      activate: () => titleHandlers.start(),
    },
    {
      kind: "action",
      label: () => "SETTINGS",
      activate: () => titleHandlers.openSettings(),
    },
    {
      kind: "action",
      label: () => "CREDITS",
      activate: () => titleHandlers.openCredits(),
    },
  ]);

  const pauseSharedItems = buildSharedSettingsItems({
    musicSlider: pauseSettingsView.pauseMusicSlider,
    sfxSlider: pauseSettingsView.pauseSfxSlider,
    syncVolumeSliders: pauseSettingsView.syncVolumeSliders,
  });
  pauseMenu.setItems([
    ...pauseSharedItems,
    {
      kind: "action",
      label: () => "BACK TO GAME (ESC)",
      activate: () => pauseHandlers.resume(),
    },
  ]);

  const settingsSharedItems = buildSharedSettingsItems({
    musicSlider: pauseSettingsView.settingsMusicSlider,
    sfxSlider: pauseSettingsView.settingsSfxSlider,
    syncVolumeSliders: pauseSettingsView.syncVolumeSliders,
  });
  // Two-step "Reset Progress" — first press arms, second confirms within 3s.
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
      activate: () => settingsHandlers.back(),
    },
  ]);
}

export function updateUI() {
  if (!uiRoot) return;

  const { gameState, gameTime, gameWon, currentBoss, lastRunDebrief } =
    uiStateProvider();

  uiRoot.pos = mainCanvasSize.scale(0.5).floor();
  uiRoot.size = mainCanvasSize;

  hudGroup.size = mainCanvasSize;
  titleGroup.size = mainCanvasSize;
  loreView.root.size = mainCanvasSize;
  pauseGroup.size = mainCanvasSize;
  gameOverGroup.size = mainCanvasSize;
  preRunGroup.size = mainCanvasSize;
  settingsGroup.size = mainCanvasSize;
  creditsView.root.size = mainCanvasSize;

  hudView.setVisible(
    gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE,
  );
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  loreView.setVisible(gameState === GAME_STATES.LORE);
  preRunGroup.visible = gameState === GAME_STATES.HOME;
  gameOverGroup.visible = gameState === GAME_STATES.POST_RUN;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;
  creditsView.setVisible(gameState === GAME_STATES.CREDITS);

  if (titleGroup.visible) {
    titleView.update({
      menu: titleMenu,
      focusColor: FOCUS_COLOR,
      idleColor: IDLE_COLOR,
    });
  }

  if (settingsGroup.visible) {
    pauseSettingsView.updateSettings(settingsMenu, FOCUS_COLOR, IDLE_COLOR);
  }

  if (pauseGroup.visible) {
    pauseSettingsView.updatePause(pauseMenu, FOCUS_COLOR, IDLE_COLOR);
  }

  if (preRunGroup.visible) {
    economyScreens.updateHome();
  }

  economyScreens.setPostRunVisible(gameOverGroup.visible);
  if (gameOverGroup.visible) {
    economyScreens.updatePostRun({ gameWon, lastRunDebrief });
  }

  if (hudGroup.visible) {
    hudView.update({ gameTime, currentBoss });
  }
}

export function processMenuPointerInput() {
  if (!uiRoot) return;

  const { gameState } = uiStateProvider();

  if (gameState === GAME_STATES.TITLE) {
    titleView.processPointer(titleMenu);
  }

  if (gameState === GAME_STATES.SETTINGS) {
    pauseSettingsView.processSettingsPointer(settingsMenu);
  }

  if (gameState === GAME_STATES.PAUSE) {
    pauseSettingsView.processPausePointer(pauseMenu);
  }
}
