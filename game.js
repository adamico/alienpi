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
  Timer,
  rand,
  drawText,
  WHITE,
} from "./node_modules/littlejsengine/dist/littlejs.esm.js";

import { system, engine } from "./src/config.js";
import { loadSprites } from "./src/sprites.js";
import { spawnPlayer } from "./src/entities/player.js";
import { Enemy } from "./src/entities/enemy.js";
import { Boss } from "./src/entities/boss.js";

let waveTimer = new Timer();
let waveIndex = 0;
let bossSpawned = false;
let currentBoss = null;

async function gameInit() {
  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);

  await loadSprites();

  spawnPlayer();
  waveTimer.set(3);
  
  // Straight to boss level
  currentBoss = new Boss(vec2(system.levelSize.x / 2, system.levelSize.y - 4));
  bossSpawned = true;
}

function gameUpdate() {
  if (bossSpawned) return; // Disable swarmers in boss level

  if (waveTimer.elapsed()) {
    spawnWave();
    waveTimer.set(5); 
    waveIndex++;
    
    if (waveIndex > 10 && !bossSpawned) {
      new Boss(vec2(system.levelSize.x / 2, system.levelSize.y - 4));
      bossSpawned = true;
    }
  }
}

function spawnWave() {
  const count = 5 + Math.floor(waveIndex / 2);
  const typeKeys = ["type1", "type2", "type3"];
  const typeKey = typeKeys[Math.floor(rand(typeKeys.length))];
  
  for (let i = 0; i < count; i++) {
    const pos = vec2(rand(system.levelSize.x), system.levelSize.y + rand(5));
    new Enemy(pos, typeKey);
  }
}

function gameUpdatePost() {}

function gameRender() {
  drawPlayField();
}

function drawPlayField() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const playFieldColor = rgb(0.01, 0.01, 0.02);
  
  // Background
  drawRect(system.cameraPos, vec2(100), marqueeColor);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x, system.levelSize.y * 2),
    playFieldColor,
  );
  
  // Simple stars or grid?
  for (let i = 0; i < 20; i++) {
    const starPos = vec2((Math.sin(i * 1234.5) * 0.5 + 0.5) * system.levelSize.x, 
                         (performance.now() * 0.001 * (i % 5 + 1) + i * 10) % (system.levelSize.y * 2));
    drawRect(starPos, vec2(0.05), rgb(1, 1, 1, 0.2));
  }
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

function drawUI() {
  if (currentBoss) {
    drawText(`BOSS HP: ${currentBoss.hp}`, vec2(system.levelSize.x / 2, system.levelSize.y - 1), 1, WHITE);
  }
}
