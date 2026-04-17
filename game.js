"use strict";

import {
  vec2,
  rgb,
  drawRect,
  setCanvasFixedSize,
  setCameraPos,
  setTileDefaultSize,
  setObjectMaxSpeed,
  engineInit,
} from "./node_modules/littlejsengine/dist/littlejs.esm.js";

import { system, engine } from "./src/config.js";
import { loadSprites } from "./src/sprites.js";
import { spawnPlayer } from "./src/entities/player.js";

async function gameInit() {
  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);

  await loadSprites();

  spawnPlayer();
}

function gameUpdate() {}

function gameUpdatePost() {}

function gameRender() {
  drawPlayField();
}

function drawPlayField() {
  const marqueeColor = rgb(0.1, 0.1, 0.1);
  const playFieldColor = rgb(0, 0, 0);
  drawRect(system.cameraPos, vec2(100), marqueeColor);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x, system.levelSize.y * 4),
    playFieldColor,
  );
}

function gameRenderPost() {
  drawUI();
}

engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
  system.spriteSheet,
);

function drawUI() {}
