"use strict";

import {
  vec2,
  rgb,
  drawRect,
  engineInit,
  drawTextScreen,
  WHITE,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  setFontDefault,
  engineObjects,
  timeReal,
  timeDelta,
  sin,
  engineObjectsDestroy,
  keyWasPressed,
  setPaused,
} from "./src/engine.js";
import { FONT_HUD, preloadFonts } from "./src/fonts.js";

import {
  system,
  settings,
  loadSettings,
  GAME_STATES,
  starfield as starCfg,
} from "./src/config.js";
import { tickDPSLog, setEnemyCount } from "./src/dpsTracker.js";
import { resetScore } from "./src/score.js";
import { initializeGameAssets, initializePlayer } from "./src/commonSetup.js";
import { Boss } from "./src/entities/boss.js";
import {
  soundBossMusic,
  soundTitleMusic,
  soundVictoryMusic,
  soundGameOverMusic,
} from "./src/sounds.js";
import { Boundary } from "./src/entities/boundary.js";
import {
  initUI,
  updateUI,
  titleMenu,
  pauseMenu,
  settingsMenu,
  setMenuHandlers,
} from "./src/ui.js";

let currentBoss = null;
let player = null;
const boundaries = [];

let activeMusicSound = null;
let activeMusicInstance = null;
export let gameState = GAME_STATES.TITLE;
let previousState = GAME_STATES.TITLE;
let gameOverTime = 0;
export let gameTime = 0;
export let gameWon = false;

async function gameInit() {
  loadSettings();
  await preloadFonts();
  setFontDefault(FONT_HUD);
  await initializeGameAssets();
  setPaused(true);
  initUI();
  setMenuHandlers({
    title: {
      start: () => {
        resetGame();
        setPaused(false);
      },
      openSettings: () => {
        previousState = gameState;
        gameState = GAME_STATES.SETTINGS;
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
  gameState = GAME_STATES.PLAYING;
}

function setupBoundaries() {
  const wallThick = 2;
  const { x: lx, y: ly } = system.levelSize;
  const margin = 1; // Align with visual playfield

  // -- SOLID WALLS (for Player) --
  // Left
  boundaries.push(
    new Boundary(
      vec2(-margin - wallThick / 2, ly / 2),
      vec2(wallThick, ly * 3),
    ),
  );
  // Right
  boundaries.push(
    new Boundary(
      vec2(lx + margin + wallThick / 2, ly / 2),
      vec2(wallThick, ly * 3),
    ),
  );
  // Top
  boundaries.push(
    new Boundary(
      vec2(lx / 2, ly + margin + wallThick / 2),
      vec2(lx * 2, wallThick),
    ),
  );
  // BOTTOM
  boundaries.push(
    new Boundary(vec2(lx / 2, -wallThick / 2), vec2(lx * 2, wallThick)),
  );
}

function gameUpdate() {
  if (gameState !== GAME_STATES.PLAYING) return;

  if (system.enableDPSLog) updateDPSLog();

  gameTime += timeDelta;

  if (player && player.hp <= 0) {
    gameState = GAME_STATES.GAMEOVER;
    setPaused(true);
    gameOverTime = timeReal;
  } else if (currentBoss && currentBoss.destroyed) {
    gameWon = true;
    gameState = GAME_STATES.GAMEOVER;
    setPaused(true);
    gameOverTime = timeReal;
  }
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

function dispatchMenu(menu) {
  for (const code of MENU_KEYS) {
    if (keyWasPressed(code)) {
      menu.handleKey(code);
      return;
    }
  }
  // KeyS is overloaded with movement; only deliver to menu if no other key fired.
  if (keyWasPressed("KeyS")) menu.handleKey("KeyS");
}

function gameUpdatePost() {
  if (gameState === GAME_STATES.TITLE) {
    dispatchMenu(titleMenu);
  } else if (gameState === GAME_STATES.PLAYING) {
    if (keyWasPressed("Escape") || keyWasPressed("KeyP")) {
      gameState = GAME_STATES.PAUSE;
      setPaused(true);
    }
  } else if (gameState === GAME_STATES.PAUSE) {
    if (keyWasPressed("Escape") || keyWasPressed("KeyP")) {
      gameState = GAME_STATES.PLAYING;
      setPaused(false);
    } else {
      dispatchMenu(pauseMenu);
    }
  } else if (gameState === GAME_STATES.SETTINGS) {
    if (keyWasPressed("Escape")) {
      gameState = previousState;
    } else {
      dispatchMenu(settingsMenu);
    }
  } else if (gameState === GAME_STATES.GAMEOVER) {
    if (timeReal - gameOverTime > 1.0) {
      if (keyWasPressed("Enter") || keyWasPressed("Space")) {
        resetGame();
        setPaused(false);
      } else if (keyWasPressed("Escape")) {
        gameState = GAME_STATES.TITLE;
        setPaused(true);
      }
    }
  }

  updateMusic();
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
      return soundTitleMusic;
    case GAME_STATES.PLAYING:
    case GAME_STATES.PAUSE:
      return soundBossMusic;
    case GAME_STATES.GAMEOVER:
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

function drawPlayField() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const playFieldColor = rgb(0.01, 0.01, 0.02);

  // Background
  const margin = 1;
  drawRect(system.cameraPos, vec2(100), marqueeColor);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x + margin * 2, system.levelSize.y * 2),
    playFieldColor,
  );

  // precreate variables to avoid overhead
  const pos = vec2(),
    size = vec2(),
    color = rgb();
  for (let i = starCfg.count; i--; ) {
    // use math to generate random star positions
    const offset =
      timeReal * (starCfg.speedBase + (i ** 2.1 % starCfg.speedRange)) +
      i ** 2.3;
    pos.y = starCfg.verticalOffset - (offset % starCfg.verticalRange);
    pos.x = i / system.levelSize.x - starCfg.horizontalOffset;
    size.x = size.y = (i % starCfg.sizeRange) + starCfg.sizeBase;
    color.set(0.5, 0.5, 0.5, sin(i) ** starCfg.alphaPower);
    drawRect(pos, size, color);
  }
}

function gameRenderPost() {
  drawMarquee();
  drawUI();
}

function drawMarquee() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const { x: lx, y: ly } = system.levelSize;
  const margin = 1;

  const maskSize = 100;
  const maskReach = lx * 5;

  // Mask off areas outside the visible playfield
  // Left Mask
  drawRect(
    vec2(-maskSize / 2 - margin, ly),
    vec2(maskSize, ly * 3),
    marqueeColor,
  );
  // Right Mask
  drawRect(
    vec2(lx + maskSize / 2 + margin, ly),
    vec2(maskSize, ly * 3),
    marqueeColor,
  );
  // Top Mask
  drawRect(
    vec2(lx / 2, ly + margin + maskSize / 2),
    vec2(maskReach, maskSize),
    marqueeColor,
  );
  // Bottom Mask
  drawRect(
    vec2(lx / 2, -margin - maskSize / 2),
    vec2(maskReach, maskSize),
    marqueeColor,
  );
}

function drawUI() {
  if (settings.customDebug) drawDebug();
}

function drawDebug() {
  const debugX = 120;
  if (currentBoss) {
    drawTextScreen(
      `BOSS HP: ${currentBoss.hp}`,
      vec2(system.canvasSize.x / 2, 50),
      32,
      WHITE,
    );
  }

  drawTextScreen(
    `WEAPON: ${player.currentWeapon.label}`,
    vec2(debugX, 120),
    24,
    WHITE,
  );
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
