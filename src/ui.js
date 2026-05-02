import { UIObject, mainCanvasSize, Color } from "./engine.js";

import {
  getGameState,
  getGameTime,
  getGameWon,
  getCurrentBoss,
  getLastRunDebrief,
} from "./game/world.js";

import { createCreditsScreen } from "./ui/creditsScreen.js";
import { createEconomyScreens } from "./ui/economyScreens.js";
import { createHudView } from "./ui/hudView.js";
import { createLoreScreen } from "./ui/storyScreen.js";
import { createPauseScreen } from "./ui/pauseScreen.js";
import { createSettingsScreen } from "./ui/settingsScreen.js";
import { createTitleScreen } from "./ui/titleScreen.js";
import { titleMenu, pauseMenu, settingsMenu } from "./ui/menus.js";

let creditsView;
let economyScreens;
let hudView;
let loreView;
let pauseView;
let settingsView;
let titleView;
let uiRoot;

export { titleMenu, pauseMenu, settingsMenu } from "./ui/menus.js";

export function initUI({ handlers = {} } = {}) {
  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  hudView = createHudView(uiRoot);
  titleView = createTitleScreen(uiRoot, titleMenu, handlers.title ?? {});
  pauseView = createPauseScreen(uiRoot, pauseMenu, {
    resume: handlers.pause?.resume,
  });
  settingsView = createSettingsScreen(uiRoot, settingsMenu, {
    back: handlers.settings?.back,
  });
  creditsView = createCreditsScreen(uiRoot);
  loreView = createLoreScreen(uiRoot);
  economyScreens = createEconomyScreens(uiRoot);
}

export function updateUI() {
  if (!uiRoot) return;

  const gameState = getGameState();
  uiRoot.pos = mainCanvasSize.scale(0.5).floor();
  uiRoot.size = mainCanvasSize;

  hudView.tick(gameState, {
    gameTime: getGameTime(),
    currentBoss: getCurrentBoss(),
  });
  titleView.tick(gameState);
  loreView.tick(gameState);
  creditsView.tick(gameState);
  pauseView.tick(gameState);
  settingsView.tick(gameState);
  economyScreens.tick(gameState, {
    gameWon: getGameWon(),
    lastRunDebrief: getLastRunDebrief(),
  });
}

export function handleLoreConfirm() {
  return loreView ? loreView.handleConfirm() : true;
}
