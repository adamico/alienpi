"use strict";

import {
  engineInit,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  setFontDefault,
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
} from "./src/ui.js";
import {
  sceneManager,
  collectSceneActions,
  transitionTo,
  pushState,
  popState,
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
  initUI({
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
