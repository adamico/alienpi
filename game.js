"use strict";

import {
  engineInit,
  glSetAntialias,
  setTilesPixelated,
  setFontDefault,
  timeDelta,
  setPaused,
  setDebugWatermark,
  setTouchGamepadEnable,
  setTouchGamepadSize,
} from "./src/engine.js";
import { FONT_HUD, preloadFonts } from "./src/visuals/fonts.js";

import { system } from "./src/config/index.js";
import { loadSettings } from "./src/persistence.js";
import { initializeGameAssets } from "./src/commonSetup.js";
import { loadHighScore } from "./src/game/score.js";
import { loadEconomy } from "./src/game/economy.js";
import {
  loadTutorialProgress,
  applyTutorialInput,
} from "./src/game/tutorialProgress.js";
import { input } from "./src/input/input.js";
import { loadBindingsFromSettings, actionPressed } from "./src/input/bindings.js";
import { tickTimeScale } from "./src/game/timeScale.js";
import { getGameState } from "./src/game/world.js";
import { GAME_STATES } from "./src/config/index.js";
import { renderBackground, renderPostBackground } from "./src/game/scene.js";
import { updateUI } from "./src/ui.js";
import {
  updateSceneFrame,
  initUIHandlers,
} from "./src/scenes/gameSceneManager.js";
import { updateAudio } from "./src/audio/soundManager.js";
import { installAutoPause } from "./src/autoPause.js";

async function gameInit() {
  loadSettings();
  loadBindingsFromSettings();
  loadHighScore();
  loadEconomy();
  loadTutorialProgress();
  await preloadFonts();
  setFontDefault(FONT_HUD);
  await initializeGameAssets();
  setDebugWatermark(false);
  setTouchGamepadEnable(true);
  setTouchGamepadSize(200);
  setPaused(true);
  initUIHandlers();
  installAutoPause();

  // Dismiss the loading overlay now that all assets are ready
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.add("hidden");
    loader.addEventListener("transitionend", () => loader.remove(), {
      once: true,
    });
  }
}

function gameUpdate() {
  input.reset();
  input.update();
  applyTutorialInput();
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

function gameUpdatePost() {
  if (actionPressed("fullScreen")) toggleFullscreen();
  tickTimeScale(getGameState() === GAME_STATES.PLAYING);
  updateSceneFrame(timeDelta);
  updateAudio();
  updateUI();
}

glSetAntialias(true);
setTilesPixelated(false);

engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  renderBackground,
  renderPostBackground,
  system.spriteSheetLists.map((path) => path.replace(/&/g, "%26")),
);
