import {
  getGameState,
  getGameTime,
  getGameWon,
  getCurrentBoss,
  getLastRunDebrief,
} from "../game/world.js";
import { GAME_STATES } from "../config/index.js";
import { createCreditsScreen } from "./creditsScreen.js";
import { createEconomyScreens } from "./economyScreens.js";
import { createHudView } from "./hudView.js";
import { createLoreScreen } from "./storyScreen.js";
import { createPauseScreen } from "./pauseScreen.js";
import { createSettingsScreen } from "./settingsScreen.js";
import { createTitleScreen } from "./titleScreen.js";
import { createTutorialScreen } from "./tutorialScreen.js";
import { createIconDebugScreen } from "./iconDebugScreen.js";
import { pauseMenu, settingsMenu, titleMenu } from "./menus.js";

export function getUIContext() {
  return {
    gameState: getGameState(),
    gameTime: getGameTime(),
    gameWon: getGameWon(),
    currentBoss: getCurrentBoss(),
    lastRunDebrief: getLastRunDebrief(),
  };
}

export const uiViewRegistry = [];

export function registerUIView({ id, create, tick, confirmStates }) {
  if (uiViewRegistry.some((v) => v.id === id)) {
    throw new Error(`UI view "${id}" is already registered`);
  }
  uiViewRegistry.push({
    id,
    create,
    tick: tick ?? ((view, context) => view.tick(context.gameState)),
    confirmStates,
  });
  return registerUIView;
}

registerUIView({
  id: "hud",
  create: (uiRoot) => createHudView(uiRoot),
  tick: (view, context) =>
    view.tick(context.gameState, {
      gameTime: context.gameTime,
      currentBoss: context.currentBoss,
    }),
});

registerUIView({
  id: "title",
  create: (uiRoot, handlers) =>
    createTitleScreen(uiRoot, titleMenu, handlers.title ?? {}),
});

registerUIView({
  id: "pause",
  create: (uiRoot, handlers) =>
    createPauseScreen(uiRoot, pauseMenu, {
      resume: handlers.pause?.resume,
    }),
});

registerUIView({
  id: "settings",
  create: (uiRoot, handlers) =>
    createSettingsScreen(uiRoot, settingsMenu, {
      back: handlers.settings?.back,
    }),
});

registerUIView({
  id: "credits",
  create: (uiRoot) => createCreditsScreen(uiRoot),
  confirmStates: [GAME_STATES.CREDITS],
});

registerUIView({
  id: "lore",
  create: (uiRoot) => createLoreScreen(uiRoot),
  confirmStates: [GAME_STATES.LORE],
});

registerUIView({
  id: "tutorial",
  create: (uiRoot) => createTutorialScreen(uiRoot),
});

registerUIView({
  id: "economy",
  create: (uiRoot) => createEconomyScreens(uiRoot),
  tick: (view, context) =>
    view.tick(context.gameState, {
      gameWon: context.gameWon,
      lastRunDebrief: context.lastRunDebrief,
    }),
});

registerUIView({
  id: "iconDebug",
  create: (uiRoot) => createIconDebugScreen(uiRoot),
});
