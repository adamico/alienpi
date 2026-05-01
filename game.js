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
  titleMenu,
  pauseMenu,
  settingsMenu,
  setMenuHandlers,
} from "./src/ui.js";
import { SceneContext } from "./src/scenes/sceneContext.js";
import { SceneManager } from "./src/scenes/sceneManager.js";
import { SCENE_TRANSITIONS } from "./src/scenes/transitionPolicy.js";
import {
  collectSceneActions,
} from "./src/scenes/sceneActions.js";
import { createGameScenes } from "./src/scenes/gameScenes.js";

export let currentBoss = null;
let player = null;

let activeMusicSound = null;
let activeMusicInstance = null;
export let gameState = GAME_STATES.TITLE;
let gameOverTime = 0;
export let gameTime = 0;
export let gameWon = false;
export let lastRunDebrief = null;

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
});

function transitionTo(nextState, payload = {}, reason = "transition") {
  return sceneManager.transitionTo(nextState, payload, reason);
}

function pushState(nextState, payload = {}, reason = "push") {
  return sceneManager.pushState(nextState, payload, reason);
}

function popState(payload = {}, reason = "pop") {
  return sceneManager.popState(payload, reason);
}

const scenes = createGameScenes({
  transitionTo,
  pushState,
  popState,
  resetGame: () => resetGame(),
  setPaused,
  getTimeReal: () => timeReal,
  getGameOverTime: () => gameOverTime,
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
  initUI();
  setMenuHandlers({
    title: {
      start: () => {
        transitionTo(GAME_STATES.LORE, {}, "title:start");
      },
      openSettings: () => {
        pushState(GAME_STATES.SETTINGS, {}, "title:open-settings");
      },
      openCredits: () => {
        transitionTo(GAME_STATES.CREDITS, {}, "title:open-credits");
      },
    },
    pause: {
      resume: () => {
        transitionTo(GAME_STATES.PLAYING, {}, "pause:resume");
        setPaused(false);
      },
    },
    settings: {
      back: () => {
        popState({}, "settings:back");
      },
    },
    credits: {
      back: () => {
        transitionTo(GAME_STATES.TITLE, {}, "credits:back");
      },
    },
    lore: {
      start: () => {
        transitionTo(GAME_STATES.HOME, {}, "lore:start");
      },
    },
  });
}

export function resetGame() {
  system.isResetting = true;
  engineObjectsDestroy();
  system.isResetting = false;
  player = initializePlayer();

  // Straight to boss level
  currentBoss = new Boss(vec2(system.levelSize.x / 2, system.levelSize.y - 4));

  setupBoundaries();
  gameTime = 0;
  gameWon = false;
  resetScore();
  beginRun();
  transitionTo(
    GAME_STATES.PLAYING,
    { gameWon, lastRunDebrief, gameOverTime },
    "run:start",
  );
}

function gameUpdate() {
  input.reset();
  input.update();
  if (gameState !== GAME_STATES.PLAYING) return;

  if (system.enableDPSLog) updateDPSLog();

  gameTime += timeDelta;

  if (player && player.hp <= 0) {
    enterPostRun("defeat");
    vibrate(800, 1.0, 1.0);
  } else if (currentBoss && currentBoss.destroyed) {
    gameWon = true;
    enterPostRun("victory");
    vibrate(400, 0.6, 0.4);
  }
}

// Wipe the playfield on run end: pause halts updates but particles and
// child emitters that were live in the last frame stay resident and pile up
// across replays. Destroying everything lets GC reclaim them and keeps the
// debrief overlay rendering over a clean field.
function enterPostRun(outcome) {
  soundGameOverJingle.play();
  system.isResetting = true;
  engineObjectsDestroy();
  system.isResetting = false;
  setPaused(true);
  gameOverTime = timeReal;
  commitHighScore();
  lastRunDebrief = commitRun(outcome);
  transitionTo(
    GAME_STATES.POST_RUN,
    { gameWon, lastRunDebrief, gameOverTime, outcome },
    "run:post",
  );
}

let lastGamepadStick = vec2(0);

function gameUpdatePost() {
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

function desiredMusic() {
  switch (gameState) {
    case GAME_STATES.TITLE:
    case GAME_STATES.CREDITS:
      return soundTitleMusic; // Placeholder, could be a separate track for credits
    case GAME_STATES.LORE:
    case GAME_STATES.HOME:
      return soundTitleMusic; // Placeholder, could be a separate track for lore/pre-run
    case GAME_STATES.PLAYING:
    case GAME_STATES.PAUSE:
      return soundBossMusic;
    case GAME_STATES.POST_RUN:
      return gameWon ? soundVictoryMusic : soundGameOverMusic;
    case GAME_STATES.SETTINGS:
      // Keep whatever was playing when the user opened settings.
      return activeMusicSound;
    default:
      return null;
  }
}

function updateMusic() {
  const desired = desiredMusic();
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
