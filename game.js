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

export let currentBoss = null;
let player = null;

let activeMusicSound = null;
let activeMusicInstance = null;
export let gameState = GAME_STATES.TITLE;
let previousState = GAME_STATES.TITLE;
let gameOverTime = 0;
export let gameTime = 0;
export let gameWon = false;
export let lastRunDebrief = null;

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
        gameState = GAME_STATES.LORE;
      },
      openSettings: () => {
        previousState = gameState;
        gameState = GAME_STATES.SETTINGS;
      },
      openCredits: () => {
        gameState = GAME_STATES.CREDITS;
      },
    },
    pause: {
      resume: () => {
        gameState = GAME_STATES.PLAYING;
        setPaused(false);
      },
    },
    settings: {
      back: () => {
        gameState = previousState;
      },
    },
    credits: {
      back: () => {
        gameState = GAME_STATES.TITLE;
      },
    },
    lore: {
      start: () => {
        gameState = GAME_STATES.HOME;
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
  gameState = GAME_STATES.PLAYING;
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
  gameState = GAME_STATES.POST_RUN;
}

const MENU_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyD",
  "Enter",
  "Space",
];

let lastGamepadStick = vec2(0);
const inputActions = {
  confirm: () =>
    keyWasPressed("Enter") || keyWasPressed("Space") || gamepadWasReleased(0),
  cancel: () =>
    keyWasPressed("Escape") || gamepadWasReleased(8) || gamepadWasReleased(1),
  pause: () =>
    keyWasPressed("Escape") || keyWasPressed("KeyP") || gamepadWasReleased(11),
};

function dispatchMenu(menu) {
  // Keyboard navigation
  for (const code of MENU_KEYS) {
    if (keyWasPressed(code)) {
      menu.handleKey(code);
      return;
    }
  }
  if (keyWasPressed("KeyS")) menu.handleKey("KeyS");

  // Gamepad navigation
  const gStick = gamepadStick(0);
  const stickThreshold = 0.5;
  const stickUp =
    gStick.y > stickThreshold && lastGamepadStick.y <= stickThreshold;
  const stickDown =
    gStick.y < -stickThreshold && lastGamepadStick.y >= -stickThreshold;
  const stickLeft =
    gStick.x < -stickThreshold && lastGamepadStick.x >= -stickThreshold;
  const stickRight =
    gStick.x > stickThreshold && lastGamepadStick.x <= stickThreshold;
  lastGamepadStick = gStick;

  if (gamepadWasReleased(12) || stickUp) {
    menu.handleKey("ArrowUp");
  } else if (gamepadWasReleased(13) || stickDown) {
    menu.handleKey("ArrowDown");
  } else if (gamepadWasReleased(14) || stickLeft) {
    menu.handleKey("ArrowLeft");
  } else if (gamepadWasReleased(15) || stickRight) {
    menu.handleKey("ArrowRight");
  } else if (inputActions.confirm()) {
    menu.handleKey("Enter");
  } else if (inputActions.cancel()) {
    menu.handleKey("Escape");
  }
}

function gameUpdatePost() {
  if (gameState === GAME_STATES.TITLE) {
    dispatchMenu(titleMenu);
  } else if (gameState === GAME_STATES.LORE) {
    if (inputActions.confirm() || mouseWasReleased(0)) {
      gameState = GAME_STATES.HOME;
    }
  } else if (gameState === GAME_STATES.HOME) {
    if (inputActions.confirm() || mouseWasReleased(0)) {
      resetGame();
      setPaused(false);
    } else if (inputActions.cancel()) {
      gameState = GAME_STATES.TITLE;
      setPaused(true);
    }
  } else if (gameState === GAME_STATES.PLAYING) {
    if (inputActions.pause()) {
      gameState = GAME_STATES.PAUSE;
      setPaused(true);
    }
  } else if (gameState === GAME_STATES.PAUSE) {
    if (inputActions.pause()) {
      gameState = GAME_STATES.PLAYING;
      setPaused(false);
    } else {
      dispatchMenu(pauseMenu);
    }
  } else if (gameState === GAME_STATES.SETTINGS) {
    if (inputActions.cancel()) {
      gameState = previousState;
    } else {
      dispatchMenu(settingsMenu);
    }
  } else if (gameState === GAME_STATES.CREDITS) {
    if (
      inputActions.cancel() ||
      inputActions.confirm() ||
      mouseWasReleased(0)
    ) {
      gameState = GAME_STATES.TITLE;
    }
  } else if (gameState === GAME_STATES.POST_RUN) {
    if (timeReal - gameOverTime > 1.0) {
      if (
        inputActions.confirm() ||
        inputActions.cancel() ||
        mouseWasReleased(0)
      ) {
        gameState = GAME_STATES.HOME;
      }
    }
  }

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
  drawPlayField();
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
