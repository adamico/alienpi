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
import { renderBackground, renderPostBackground } from "./src/game/scene.js";
import { updateUI } from "./src/ui.js";
import {
  updateSceneFrame,
  initUIHandlers,
} from "./src/scenes/gameSceneManager.js";
import { updateAudio } from "./src/audio/soundManager.js";

async function gameInit() {
  loadSettings();
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

function gameUpdatePost() {
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
  system.spriteSheetLists,
);
