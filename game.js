"use strict";

import {
  vec2,
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  setFontDefault,
  engineObjects,
  timeReal,
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
import { resetScore, loadHighScore, commitHighScore } from "./src/score.js";
import { loadEconomy, beginRun, commitRun } from "./src/economy.js";
import { initializeGameAssets, initializePlayer } from "./src/commonSetup.js";
import { Boss } from "./src/entities/boss.js";
import {
  soundBossMusic,
  soundTitleMusic,
  soundVictoryMusic,
  soundGameOverMusic,
  soundGameOverJingle,
  updateSoundVolumes,
} from "./src/sounds.js";
import { input } from "./src/input.js";
import { vibrate } from "./src/gamepad.js";
import { drawPlayField, drawMarquee, setupBoundaries } from "./src/scene.js";
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
import { collectSceneActions } from "./src/scenes/sceneActions.js";
import { createGameScenes } from "./src/scenes/gameScenes.js";

let currentBoss = null;
let player = null;

let activeMusicSound = null;
let activeMusicInstance = null;
let desiredMusicSound = soundTitleMusic;
let gameState = GAME_STATES.TITLE;
let gameOverTime = 0;
let gameTime = 0;
let gameWon = false;
let lastRunDebrief = null;

function getDesiredMusicForTransition(nextState, context, currentDesired) {
  switch (nextState) {
    case GAME_STATES.TITLE:
    case GAME_STATES.CREDITS:
    case GAME_STATES.LORE:
    case GAME_STATES.HOME:
      return soundTitleMusic;
    case GAME_STATES.PLAYING:
    case GAME_STATES.PAUSE:
      return soundBossMusic;
    case GAME_STATES.POST_RUN:
      return context.gameWon ? soundVictoryMusic : soundGameOverMusic;
    case GAME_STATES.SETTINGS:
      // Keep whatever was already selected before entering settings.
      return currentDesired;
    default:
      return null;
  }
}

const sceneContext = new SceneContext({
  gameWon,
  lastRunDebrief,
  gameOverTime,
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
  gameOverTime = context.gameOverTime;
  desiredMusicSound = getDesiredMusicForTransition(
    to,
    context,
    desiredMusicSound,
  );
});

const transitionTo = sceneManager.transitionTo.bind(sceneManager);
const pushState = sceneManager.pushState.bind(sceneManager);
const popState = sceneManager.popState.bind(sceneManager);

const scenes = createGameScenes({
  transitionTo,
  pushState,
  popState,
  setPaused,
  getTimeReal: () => timeReal,
  getGameOverTime: () => gameOverTime,
  soundGameOverJingle,
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
  getPlayer: () => player,
  getCurrentBoss: () => currentBoss,
  commitHighScore,
  commitRun,
  vibrate,
  onTick: (dt) => {
    gameTime += dt;
  },
  onDPSTick: () => {
    if (system.enableDPSLog) updateDPSLog();
  },
  initializePlayer: () => {
    player = initializePlayer();
  },
  spawnBoss: () => {
    currentBoss = new Boss(
      vec2(system.levelSize.x / 2, system.levelSize.y - 4),
    );
  },
  setupBoundaries,
  resetGameTime: () => {
    gameTime = 0;
  },
  resetScore,
  beginRun,
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
      gameTime,
      gameWon,
      currentBoss,
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

let lastGamepadStick = vec2(0);

function gameUpdatePost() {
  processMenuPointerInput();

  const frameActions = collectSceneActions({
    keyWasPressed,
    gamepadWasReleased,
    mouseWasReleased,
    gamepadStick,
    lastGamepadStick,
  });
  const actions = frameActions.actions;
  lastGamepadStick = frameActions.nextStick;
  sceneManager.updateFrame({ actions, dt: timeDelta, runtime: { gameState } });

  updateMusic();
  updateSoundVolumes();
  updateUI();
}

function updateDPSLog() {
  const enemies = engineObjects.filter((o) => o.isEnemy);
  setEnemyCount(enemies.length);
  tickDPSLog();
}

function updateMusic() {
  const desired = desiredMusicSound;
  if (desired !== activeMusicSound) {
    if (activeMusicInstance) {
      activeMusicInstance.stop();
      activeMusicInstance = null;
    }
    activeMusicSound = desired;
    if (desired && desired.isLoaded()) {
      activeMusicInstance = desired.playMusic(1.0, true);
    }
  } else if (!activeMusicInstance && desired && desired.isLoaded()) {
    // Track was selected before its file finished loading; start now.
    activeMusicInstance = desired.playMusic(1.0, true);
  }
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
