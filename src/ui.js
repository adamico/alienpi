import { UIObject, mainCanvasSize, Color } from "./engine.js";

import {
  getGameState,
  getGameTime,
  getGameWon,
  getCurrentBoss,
  getLastRunDebrief,
} from "./world.js";
import { titleMenu, pauseMenu, settingsMenu } from "./menus.js";
import { createPauseSettingsScreens } from "./ui/pauseSettingsScreens.js";
import { createLoreScreen, createCreditsScreen } from "./ui/storyScreens.js";
import { createHudView } from "./ui/hudView.js";
import { createEconomyScreens } from "./ui/economyScreens.js";
import { createTitleScreen } from "./ui/titleScreen.js";

let uiRoot;
let hudView;
let economyScreens;
let titleView;
let pauseSettingsView;
let loreView;
let creditsView;

export { titleMenu, pauseMenu, settingsMenu } from "./menus.js";

export function initUI({ handlers = {} } = {}) {
  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  hudView = createHudView(uiRoot);
  titleView = createTitleScreen(uiRoot, titleMenu, handlers.title ?? {});
  pauseSettingsView = createPauseSettingsScreens(
    uiRoot,
    pauseMenu,
    settingsMenu,
    {
      resume: handlers.pause?.resume,
      back: handlers.settings?.back,
    },
  );
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
  pauseSettingsView.tick(gameState);
  economyScreens.tick(gameState, {
    gameWon: getGameWon(),
    lastRunDebrief: getLastRunDebrief(),
  });
}
