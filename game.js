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
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  PostProcessPlugin,
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
  const sharpenShader = `
  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord.xy / iResolution.xy;
      vec2 step = 1.0 / iResolution.xy;
      
      vec4 tex0 = texture(iChannel0, uv);
      vec4 tex1 = texture(iChannel0, uv + vec2(step.x, 0.0));
      vec4 tex2 = texture(iChannel0, uv + vec2(-step.x, 0.0));
      vec4 tex3 = texture(iChannel0, uv + vec2(0.0, step.y));
      vec4 tex4 = texture(iChannel0, uv + vec2(0.0, -step.y));
      
      // Simple 5-tap sharpening kernel
      fragColor = tex0 * 5.0 - (tex1 + tex2 + tex3 + tex4);
  }`;
  new PostProcessPlugin(sharpenShader);

  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);

  // Load all spritesheets defined in config
  for (let i = 0; i < system.spriteSheetLists.length; i++) {
    const fullPath = system.spriteSheetLists[i].replace(".png", "");
    await loadSprites(fullPath, i);
  }

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
  
  // Vibrant scrolling starfield
  for (let i = 0; i < 40; i++) {
    const speed = (i % 5 + 1) * 2;
    const x = ((Math.sin(i * 1337) * 0.5 + 0.5) * system.levelSize.x);
    const time = performance.now() * 0.001;
    const y = (system.levelSize.y * 2 - (time * speed + i * 2) % (system.levelSize.y * 2));
    
    const size = 0.05 + (i % 3) * 0.03;
    drawRect(vec2(x, y), vec2(size), rgb(1, 1, 1, 0.4));
  }
}

function gameRenderPost() {
  drawUI();
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

function drawUI() {
  if (currentBoss) {
    drawText(`BOSS HP: ${currentBoss.hp}`, vec2(system.levelSize.x / 2, system.levelSize.y - 1), 1, WHITE);
  }
}
