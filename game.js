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
  EngineObject,
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
const boundaries = [];

class Boundary extends EngineObject {
  constructor(pos, size, isKillZone = false) {
    super(pos, size);
    this.isKillZone = isKillZone;
    this.isBoundary = true;
    this.setCollision(true, !isKillZone); // Always a collider, only solid if not a kill zone
    this.mass = 0;
  }
  render() {} // Invisible
}

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

  // Setup level boundaries
  const wallThick = 2;
  const { x: lx, y: ly } = system.levelSize;
  const margin = 1; // Align with visual playfield
  
  // -- SOLID WALLS (for Player) --
  // Left
  boundaries.push(new Boundary(vec2(-margin - wallThick/2, ly/2), vec2(wallThick, ly * 3)));
  // Right
  boundaries.push(new Boundary(vec2(lx + margin + wallThick/2, ly/2), vec2(wallThick, ly * 3)));
  // Top
  boundaries.push(new Boundary(vec2(lx/2, ly + margin + wallThick/2), vec2(lx * 2, wallThick)));
  // Bottom
  boundaries.push(new Boundary(vec2(lx/2, -wallThick/2), vec2(lx * 2, wallThick)));
}

function gameUpdate() {
  if (bossSpawned) return; // Disable swarmers in boss level

  if (waveTimer.elapsed()) {
    spawnWave();
    waveTimer.set(5); 
    waveIndex++;
    
    if (waveIndex > 10 && !bossSpawned) {
      currentBoss = new Boss(vec2(system.levelSize.x / 2, system.levelSize.y - 4));
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
  const margin = 1;
  drawRect(system.cameraPos, vec2(100), marqueeColor);
  drawRect(
    system.cameraPos,
    vec2(system.levelSize.x + margin * 2, system.levelSize.y * 2),
    playFieldColor,
  );
  
  // Vibrant scrolling starfield
  for (let i = 0; i < 40; i++) {
    const speed = (i % 5 + 1) * 2;
    // Spread stars across the entire width including margins
    const x = ((Math.sin(i * 1337) * 0.5 + 0.5) * (system.levelSize.x + margin * 2)) - margin;
    const time = performance.now() * 0.001;
    const y = (system.levelSize.y * 2 - (time * speed + i * 2) % (system.levelSize.y * 2));
    
    const size = 0.05 + (i % 3) * 0.03;
    drawRect(vec2(x, y), vec2(size), rgb(1, 1, 1, 0.4));
  }
}

function gameRenderPost() {
  drawMarquee();
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

function drawMarquee() {
  const marqueeColor = rgb(0.05, 0.05, 0.1);
  const { x: lx, y: ly } = system.levelSize;
  const margin = 1;

  const maskSize = 100;
  const maskReach = lx * 5;

  // Mask off areas outside the visible playfield
  // Left Mask
  drawRect(vec2(-maskSize / 2 - margin, ly), vec2(maskSize, ly * 3), marqueeColor);
  // Right Mask
  drawRect(vec2(lx + maskSize / 2 + margin, ly), vec2(maskSize, ly * 3), marqueeColor);
  // Top Mask
  drawRect(vec2(lx / 2, ly + margin + maskSize / 2), vec2(maskReach, maskSize), marqueeColor);
  // Bottom Mask
  drawRect(vec2(lx / 2, -margin - maskSize / 2), vec2(maskReach, maskSize), marqueeColor);
}

function drawUI() {
  if (currentBoss) {
    drawText(`BOSS HP: ${currentBoss.hp}`, vec2(system.levelSize.x / 2, system.levelSize.y - 1), 1, WHITE);
  }
}
