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
import { FONT_HUD, preloadFonts } from "./src/fonts.js";

import { system, loadSettings } from "./src/config.js";
import { initializeGameAssets } from "./src/commonSetup.js";
import { loadHighScore } from "./src/score.js";
import { loadEconomy } from "./src/economy.js";
import { input } from "./src/input.js";
import { renderBackground, renderPostBackground } from "./src/scene.js";
import { updateUI } from "./src/ui.js";
import {
  updateSceneFrame,
  initUIHandlers,
} from "./src/scenes/gameSceneManager.js";
import { updateAudio } from "./src/soundManager.js";

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
  initUIHandlers();
}

function gameUpdate() {
  input.reset();
  input.update();
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
