import {
  vec2,
  rgb,
  WHITE,
  UISystemPlugin,
  uiSystem,
  UIObject,
  UIText,
  timeReal,
  mainCanvasSize,
  Color,
  mouseWasReleased,
} from "./engine.js";

import {
  settings,
  saveSettings,
  GAME_STATES,
  strings,
} from "./config.js";
import { Menu } from "./menuNav.js";
import { FONT_MENU } from "./fonts.js";
import { resetEconomy } from "./economy.js";
import {
  makeMenuRow,
  updateMenuInteraction,
  paintMenu,
} from "./ui/menuView.js";
import {
  buildSharedSettingsSliders,
  buildSharedSettingsRows,
  buildSharedSettingsItems,
  updateSharedSliderInput,
} from "./ui/settingsShared.js";
import { createLoreScreen, createCreditsScreen } from "./ui/storyScreens.js";
import { createHudView } from "./ui/hudView.js";
import { createEconomyScreens } from "./ui/economyScreens.js";
import { createTitleScreen } from "./ui/titleScreen.js";

let uiStateProvider = null;

let uiRoot;
let hudView;
let economyScreens;
let titleView;
let hudGroup,
  titleGroup,
  pauseGroup,
  gameOverGroup,
  preRunGroup,
  settingsGroup,
  creditsGroup,
  loreGroup;
let pauseTitleText,
  pauseMusicSlider,
  pauseSfxSlider,
  pauseMenuRows = [];
let settingsTitle,
  settingsMusicSlider,
  settingsSfxSlider,
  settingsMenuRows = [];

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

function makeRow(parent, y, h = 40) {
  return makeMenuRow(parent, y, h);
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
  setupPauseScreen();
  setupSettingsScreen();
  setupCreditsScreen();
  setupLoreScreen();
  economyScreens = createEconomyScreens(uiRoot);
  preRunGroup = economyScreens.homeGroup;
  gameOverGroup = economyScreens.postRunGroup;
  rebuildMenus();
}

function setupLoreScreen() {
  loreGroup = createLoreScreen({ uiRoot, mainCanvasSize, strings }).loreGroup;
}

function setupCreditsScreen() {
  creditsGroup = createCreditsScreen({
    uiRoot,
    mainCanvasSize,
    strings,
  }).creditsGroup;
}

function setupPauseScreen() {
  pauseGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  pauseGroup.color = new Color(0, 0, 0, 0.5);
  pauseGroup.lineWidth = 0;
  uiRoot.addChild(pauseGroup);

  // Pause uses the same layout as settings — a full-canvas dark overlay so
  // the shared row Y-positions land in the same place on both screens.
  pauseTitleText = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.pauseTitle,
  );
  pauseTitleText.textHeight = 70;
  pauseTitleText.font = FONT_MENU;
  pauseTitleText.fontShadow = true;
  pauseTitleText.textColor = rgb(0.4, 0.7, 1);
  pauseGroup.addChild(pauseTitleText);

  const sliders = buildSharedSettingsSliders(pauseGroup);
  pauseMusicSlider = sliders.music;
  pauseSfxSlider = sliders.sfx;

  pauseMenuRows = buildSharedSettingsRows(pauseGroup, makeRow);
}

function setupSettingsScreen() {
  settingsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  settingsGroup.color = new Color(0.05, 0.05, 0.1, 0.9);
  settingsGroup.lineWidth = 0;
  uiRoot.addChild(settingsGroup);

  settingsTitle = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.settingsTitle,
  );
  settingsTitle.textHeight = 70;
  settingsTitle.font = FONT_MENU;
  settingsTitle.fontShadow = true;
  settingsTitle.textColor = rgb(1, 0.8, 0.2);
  settingsGroup.addChild(settingsTitle);

  const sliders = buildSharedSettingsSliders(settingsGroup);
  settingsMusicSlider = sliders.music;
  settingsSfxSlider = sliders.sfx;

  settingsMenuRows = buildSharedSettingsRows(settingsGroup, makeRow);
  // Extra row for the "RESET PROGRESS" item — only the settings menu uses it.
  settingsMenuRows.push(makeRow(settingsGroup, 220));
}

// Reflects the on/off state into all volume sliders: forced to 0 when disabled,
// restored to the saved volume when re-enabled. Called from toggle handlers and
// per-frame so mouse drags while disabled can't leak into settings.
function syncVolumeSliders() {
  const music = settings.musicEnabled ? settings.musicVolume : 0;
  const sfx = settings.soundEffectsEnabled ? settings.sfxVolume : 0;
  if (pauseMusicSlider) pauseMusicSlider.value = music;
  if (pauseSfxSlider) pauseSfxSlider.value = sfx;
  if (settingsMusicSlider) settingsMusicSlider.value = music;
  if (settingsSfxSlider) settingsSfxSlider.value = sfx;
}

function rebuildMenus() {
  // const links = strings.ui.links;
  // Title menu
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
    // {
    //   kind: "action",
    //   label: () => links.discord.label,
    //   activate: () => openLink(links.discord.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.github.label,
    //   activate: () => openLink(links.github.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.itch.label,
    //   activate: () => openLink(links.itch.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.bluesky.label,
    //   activate: () => openLink(links.bluesky.url),
    // },
  ]);

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
      activate: () => pauseHandlers.resume(),
    },
  ]);

  const settingsSharedItems = buildSharedSettingsItems({
    musicSlider: settingsMusicSlider,
    sfxSlider: settingsSfxSlider,
    syncVolumeSliders,
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
  loreGroup.size = mainCanvasSize;
  pauseGroup.size = mainCanvasSize;
  gameOverGroup.size = mainCanvasSize;
  preRunGroup.size = mainCanvasSize;
  settingsGroup.size = mainCanvasSize;
  creditsGroup.size = mainCanvasSize;

  hudView.setVisible(
    gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE,
  );
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  loreGroup.visible = gameState === GAME_STATES.LORE;
  preRunGroup.visible = gameState === GAME_STATES.HOME;
  gameOverGroup.visible = gameState === GAME_STATES.POST_RUN;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;
  creditsGroup.visible = gameState === GAME_STATES.CREDITS;

  if (titleGroup.visible) {
    titleView.update({
      menu: titleMenu,
      focusColor: FOCUS_COLOR,
      idleColor: IDLE_COLOR,
    });
  }

  if (settingsGroup.visible) {
    updateSharedSliderInput(settingsMusicSlider, settingsSfxSlider);
    paintMenu(settingsMenu, settingsMenuRows, FOCUS_COLOR, IDLE_COLOR);
  }

  if (pauseGroup.visible) {
    updateSharedSliderInput(pauseMusicSlider, pauseSfxSlider);
    paintMenu(pauseMenu, pauseMenuRows, FOCUS_COLOR, IDLE_COLOR);
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
    updateMenuInteraction(settingsMenu, settingsMenuRows);
    if (
      mouseWasReleased(0) &&
      (settingsMusicSlider.isHoverObject() || settingsSfxSlider.isHoverObject())
    ) {
      saveSettings();
    }
  }

  if (gameState === GAME_STATES.PAUSE) {
    updateMenuInteraction(pauseMenu, pauseMenuRows);
    if (
      mouseWasReleased(0) &&
      (pauseMusicSlider.isHoverObject() || pauseSfxSlider.isHoverObject())
    ) {
      saveSettings();
    }
  }
}
