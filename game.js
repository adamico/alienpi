"use strict";

import {
  vec2,
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  setFontDefault,
  engineObjectsDestroy,
  timeDelta,
  setPaused,
  setDebugWatermark,
  setTouchGamepadEnable,
  setTouchGamepadSize,
} from "./src/engine.js";
import { FONT_HUD, preloadFonts } from "./src/fonts.js";

import { system, loadSettings, GAME_STATES } from "./src/config.js";
import { initializeGameAssets } from "./src/commonSetup.js";
import { loadHighScore } from "./src/score.js";
import { loadEconomy } from "./src/economy.js";

import { input } from "./src/input.js";
import { renderBackground, renderPostBackground } from "./src/scene.js";
import {
  initUI,
  updateUI,
  titleMenu,
  pauseMenu,
  settingsMenu,
} from "./src/ui.js";
import { SceneContext } from "./src/scenes/sceneContext.js";
import { SceneManager } from "./src/scenes/sceneManager.js";
import { SCENE_TRANSITIONS } from "./src/scenes/transitionPolicy.js";
import { createSceneActionCollector } from "./src/scenes/sceneActions.js";
import { setDesiredMusic, updateAudio } from "./src/soundManager.js";
import { createGameScenes } from "./src/scenes/gameScenes.js";
import {
  getGameTime,
  getCurrentBoss,
  getGameState,
  setGameState,
  getGameWon,
  setGameWon,
  getLastRunDebrief,
  setLastRunDebrief,
} from "./src/world.js";

const sceneContext = new SceneContext({
  gameWon,
  lastRunDebrief,
  gameOverTime: 0,
  previousState: gameState,
});

const sceneManager = new SceneManager({
  initialState: gameState,
  transitionPolicy: SCENE_TRANSITIONS,
  context: sceneContext,
});

sceneManager.subscribe(({ to, context }) => {
  setGameState(to);
  setGameWon(context.gameWon);
  setLastRunDebrief(context.lastRunDebrief);
  setDesiredMusic(scenes.get(to)?.getMusic(context));
});

const collectSceneActions = createSceneActionCollector({ vec2 });

const transitionTo = sceneManager.transitionTo.bind(sceneManager);
const pushState = sceneManager.pushState.bind(sceneManager);
const popState = sceneManager.popState.bind(sceneManager);

const scenes = createGameScenes({
  transitionTo,
  pushState,
  popState,
  destroyPlayfield: () => {
    system.isResetting = true;
    engineObjectsDestroy();
    system.isResetting = false;
  },
  menus: {
    titleMenu,
    pauseMenu,
    settingsMenu,
  },
});

for (const scene of scenes.values()) {
  sceneManager.registerScene(scene);
}

async function gameInit() {
  loadSettings();
  loadHighScore();
  loadEconomy();
  await preloadFonts();
  setFontDefault(FONT_HUD);
  await initializeGameAssets();
  setDebugWatermark(false);
  setTouchGamepadEnable(true);
  setTouchGamepadSize(200);
  setPaused(true);
  initUI({
    getUIState: () => ({
      gameState: getGameState(),
      gameTime: getGameTime(),
      gameWon: getGameWon(),
      currentBoss: getCurrentBoss(),
      lastRunDebrief: getLastRunDebrief(),
    }),
    handlers: {
      title: {
        start: () => transitionTo(GAME_STATES.LORE, {}, "title:start"),
        openSettings: () =>
          pushState(GAME_STATES.SETTINGS, {}, "title:open-settings"),
        openCredits: () =>
          transitionTo(GAME_STATES.CREDITS, {}, "title:open-credits"),
      },
      pause: {
        resume: () => transitionTo(GAME_STATES.PLAYING, {}, "pause:resume"),
      },
      settings: {
        back: () => popState({}, "settings:back"),
      },
    },
  });
}

function gameUpdate() {
  input.reset();
  input.update();
}

function gameUpdatePost() {
  const { actions } = collectSceneActions();
  sceneManager.updateFrame({ actions, dt: timeDelta });

  updateAudio();
  updateUI();
}

glSetAntialias(true);
setCanvasPixelated(false);
setTilesPixelated(false);
engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  renderBackground,
  renderPostBackground,
  system.spriteSheetLists,
);
