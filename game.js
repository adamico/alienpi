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
  drawTextScreen,
  WHITE,
  glSetAntialias,
  setCanvasPixelated,
  setTilesPixelated,
  PostProcessPlugin,
  engineObjects,
  time,
  sin,
} from "./src/engine.js";

import {
  system,
  engine,
  settings,
  starfield as starCfg,
} from "./src/config.js";
import { tickDPSLog, setEnemyCount } from "./src/dpsTracker.js";
import {
  loadSprites,
  loadDynamicSpritesheet as setupParticleSpritesheet,
} from "./src/sprites.js";
import { spawnPlayer } from "./src/entities/player.js";
import { Enemy } from "./src/entities/enemy.js";
import { Boss } from "./src/entities/boss.js";
import { soundBossMusic } from "./src/sounds.js";
import { Pinata } from "./src/entities/pinata.js";
import { enemy as enemyCfg } from "./src/config.js";
import { Boundary } from "./src/entities/boundary.js";

let waveTimer = new Timer();
let waveIndex = 0;
let bossSpawned = false;
let bossMusicPlaying = false;
let currentBoss = null;
let player = null;
let pinataTimer = new Timer(enemyCfg.swarm.pinata.spawnInterval);
const boundaries = [];

async function gameInit() {
  setupSharpenShader();
  setCanvasFixedSize(system.canvasSize);
  setCameraPos(system.cameraPos);
  setTileDefaultSize(vec2(1));
  setObjectMaxSpeed(engine.objectMaxSpeed);

  // Load all spritesheets defined in config
  await setupSpritesheets();

  // Generate dynamic particle sprite sheet
  await setupParticleSpritesheet(
    system.particleLists,
    system.particleSheetName,
  );

  player = spawnPlayer();
  waveTimer.set(3);

  if (system.playBossOnly) {
    // Straight to boss level (entryPos = in-level destination, boss spawns above)
    currentBoss = new Boss(
      vec2(system.levelSize.x / 2, system.levelSize.y - 4),
    );
    bossSpawned = true;
  }

  setupBoundaries();
}

async function setupSpritesheets() {
  for (let i = 0; i < system.spriteSheetLists.length; i++) {
    const fullPath = system.spriteSheetLists[i].replace(".png", "");
    await loadSprites(fullPath, i);
  }
}

function setupSharpenShader() {
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
  if (system.enableDPSLog) updateDPSLog();

  updatePinata();
  updateBossMusic();
  updateWaves();
}

function updateWaves() {
  if (bossSpawned) return;

  const numberEnemiesAlive = engineObjects.filter((o) => o.isEnemy).length;

  if (numberEnemiesAlive <= 0 || waveTimer.elapsed()) {
    spawnWave();
    waveTimer.set(20);
    waveIndex++;

    if (waveIndex > 10 && !bossSpawned) {
      currentBoss = new Boss(
        vec2(system.levelSize.x / 2, system.levelSize.y - 4),
      );
      bossSpawned = true;
    }
  }
}

function updateDPSLog() {
  const enemies = engineObjects.filter((o) => o.isEnemy);
  setEnemyCount(enemies.length);
  tickDPSLog();
}

function updatePinata() {
  const pinataAlive = engineObjects.some((o) => o instanceof Pinata);
  if (!pinataAlive && pinataTimer.elapsed()) {
    new Pinata(vec2(rand(5, system.levelSize.x - 5), system.levelSize.y - 2));
    pinataTimer.set(enemyCfg.swarm.pinata.spawnInterval);
  }
}

function updateBossMusic() {
  if (!bossSpawned) return;
  if (settings.musicEnabled && soundBossMusic.isLoaded() && !bossMusicPlaying) {
    const inst = soundBossMusic.playMusic(1.2);
    if (inst && inst.isPlaying()) {
      bossMusicPlaying = true;
    }
  }
}

function spawnWave() {
  const count = 5 + Math.floor(waveIndex / 3);
  let typeKey;
  if (waveIndex < 3) {
    typeKey = "type1";
  } else if (waveIndex < 6) {
    typeKey = rand() < 0.6 ? "type1" : "type3";
  } else {
    const typeKeys = ["type1", "type2", "type3"];
    typeKey = typeKeys[Math.floor(rand(typeKeys.length))];
  }

  for (let i = 0; i < count; i++) {
    const pos = vec2(rand(system.levelSize.x), system.levelSize.y + rand(1));
    new Enemy(pos, typeKey, waveIndex);
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

  // precreate variables to avoid overhead
  const pos = vec2(),
    size = vec2(),
    color = rgb();
  for (let i = starCfg.count; i--; ) {
    // use math to generate random star positions
    const offset =
      time * (starCfg.speedBase + (i ** 2.1 % starCfg.speedRange)) + i ** 2.3;
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
  drawTextScreen(`HP: ${player.hp}`, vec2(50, 50), 32, WHITE);
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

  drawTextScreen(`WAVE: ${waveIndex}`, vec2(debugX, 120), 24, WHITE);
  drawTextScreen(
    `ENEMIES ALIVE: ${engineObjects.filter((o) => o.isEnemy).length}`,
    vec2(debugX, 150),
    24,
    WHITE,
  );

  drawTextScreen(
    `WEAPON: ${player.currentWeapon.label}`,
    vec2(debugX, 180),
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
