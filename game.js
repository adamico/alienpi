"use strict";

import {
  vec2,
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  setFontDefault,
  engineObjects,
  timeDelta,
  engineObjectsDestroy,
  keyWasPressed,
  mouseWasReleased,
  setPaused,
  setDebugWatermark,
  setTouchGamepadEnable,
  setTouchGamepadSize,
  gamepadWasReleased,
  gamepadStick,
} from "./src/engine.js";
import { FONT_HUD, preloadFonts } from "./src/fonts.js";

import { system, loadSettings, GAME_STATES } from "./src/config.js";
import { tickDPSLog, setEnemyCount } from "./src/dpsTracker.js";
import { loadHighScore } from "./src/score.js";
import { loadEconomy } from "./src/economy.js";

import { input } from "./src/input.js";
import { drawPlayField, drawMarquee } from "./src/scene.js";
import {
  initUI,
  updateUI,
  processMenuPointerInput,
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

let gameState = GAME_STATES.TITLE;
let gameWon = false;
let lastRunDebrief = null;

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
  gameState = to;
  gameWon = context.gameWon;
  lastRunDebrief = context.lastRunDebrief;
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
  onDPSTick: () => {
    if (system.enableDPSLog) updateDPSLog();
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
      gameState,
      gameTime: getGameTime(),
      gameWon,
      currentBoss: getCurrentBoss(),
      lastRunDebrief,
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
  processMenuPointerInput();

  const { actions } = collectSceneActions({
    keyWasPressed,
    gamepadWasReleased,
    mouseWasReleased,
    gamepadStick,
  });
  sceneManager.updateFrame({ actions, dt: timeDelta, runtime: { gameState } });

  updateAudio();
  updateUI();
}

function updateDPSLog() {
  const enemies = engineObjects.filter((o) => o.isEnemy);
  setEnemyCount(enemies.length);
  tickDPSLog();
}

function gameRender() {
  drawPlayField({ drawStars: gameState !== GAME_STATES.POST_RUN });
}

function gameRenderPost() {
  drawMarquee();
}

glSetAntialias(true);
setCanvasPixelated(false);
setTilesPixelated(false);
engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
  system.spriteSheetLists,
);
