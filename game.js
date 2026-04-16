"use strict";

// import LittleJS module
import * as LJS from "./node_modules/littlejsengine/dist/littlejs.esm.js";
const { vec2, rgb, rand, randInt, drawCircle, drawLine, drawTextScreen } = LJS;

let input = {};

// --- SYSTEM CONFIG ---
const CANVAS_SIZE = vec2(1920, 1080);
const CAMERA_SCALE = 60;

// --- PLAYER SETTINGS ---
const PLAYER_ORBIT_RADIUS = 8;
const PLAYER_MAX_SPEED = 0.04;
const PLAYER_ACCEL = 0.005;
const PLAYER_FRICTION = 0.8;
const PLAYER_DAMP_THRESHOLD = 0.1;
const PLAYER_DAMP_FACTOR = 0.8;
const PLAYER_SNAP_THRESHOLD = 0.01;
const SHOOT_COOLDOWN = 20;

// --- COMBAT SETTINGS ---
const BULLET_SPEED = 0.3;
const BULLET_DESPAWN_RADIUS = 0.5;
const COLLISION_RADIUS = 0.6;

// --- ENEMY & WAVE SETTINGS ---
const ENEMY_TYPE_LINEAR = 0;
const ENEMY_TYPE_CENTER = 1;
const ENEMY_TYPE_SPIRAL = 2;
const ENEMY_TYPE_COUNT = 3;

const ENEMY_SPAWN_RADIUS = 12;
const ENEMY_DESPAWN_RADIUS = 20;
const ENEMY_SPEED_BASE_T0 = 0.02;
const ENEMY_SPEED_BASE_T1 = 0.05;
const ENEMY_SPEED_BASE_T2 = 0.015;
const ENEMY_SPEED_WAVE_SCALE = 0.002;
const ENEMY_SPIN_SPEED = 0.03;
const ENEMY_SPIRAL_INTENSITY = 0.02;

const PATTERN_MIN_ENEMIES = 5;
const PATTERN_MAX_ENEMIES = 10;
const PATTERN_ANGLE_RANGE = 6.28;
const PATTERN_ENEMY_OFFSET = 0.4;

const PATTERN_SPACING = 8;
const WAVE_START_DELAY = 120;
const WAVE_CLEAR_DELAY = 120;

const WAVE_BASE_ENEMIES = 8;
const WAVE_ENEMIES_GROWTH = 4;

// --- RENDER SETTINGS ---
const CORE_RADIUS = 2;
const PLAYER_RENDER_SIZE = 1;
const PLAYER_TIP_LENGTH = 1.5;
const PLAYER_LINE_WIDTH = 0.2;
const BULLET_RENDER_SIZE = 0.3;
const ENEMY_RENDER_SIZE = 0.8;

// --- COLOR PALETTE ---
const COLOR_CORE = rgb(1, 0.5, 0);
const COLOR_ORBIT = rgb(0.2, 0.2, 0.2);
const COLOR_PLAYER = rgb(0.3, 1, 0.3);
const COLOR_PLAYER_TIP = rgb(0.6, 1, 0.6);
const COLOR_BULLET = rgb(1, 1, 0);
const COLOR_ENEMY = rgb(1, 0.2, 0.2);

// --- UI SETTINGS ---
const UI_POS_WAVE = vec2(100, 64);
const UI_SIZE_WAVE = 40;

const UI_POS_REMAINING = vec2(180, 128);
const UI_SIZE_REMAINING = 30;

const UI_SIZE_CLEARED = 60;

const UI_POS_DEBUG = vec2(1700, 64);
const UI_SIZE_DEBUG = 30;
const UI_COLOR_DEBUG = rgb(1, 0, 0);

// --- STATE ---
let playerAngle = 0;
let playerAngleVel = 0;
let bullets = [];
let enemies = [];
let shootTimer = 0;

// --- WAVE SYSTEM ---
let wave = 1;
let enemiesToSpawn = 10;
let enemiesSpawned = 0;
let waveTimer = 0;
let waveClearedTimer = 0;

// --- PATTERN SPAWNING STATE ---
let currentPattern = [];
let patternIndex = 0;
let patternTimer = 0;

function createPattern() {
  const count =
    PATTERN_MIN_ENEMIES +
    randInt(PATTERN_MAX_ENEMIES - PATTERN_MIN_ENEMIES + 1);
  const baseAngle = rand(0, PATTERN_ANGLE_RANGE);

  const type = randInt(ENEMY_TYPE_COUNT);
  currentPattern = [];

  for (let i = 0; i < count; i++) {
    currentPattern.push({
      type,
      angle: baseAngle + (i - count / 2) * PATTERN_ENEMY_OFFSET,
    });
  }

  patternIndex = 0;
  patternTimer = 0;
}

function startWave() {
  enemiesToSpawn = WAVE_BASE_ENEMIES + wave * WAVE_ENEMIES_GROWTH;
  enemiesSpawned = 0;
  waveTimer = WAVE_START_DELAY;
  waveClearedTimer = 0;
}

function gameInit() {
  LJS.setCanvasFixedSize(CANVAS_SIZE);
  LJS.setCameraPos(vec2(0, 0));
  LJS.setCameraScale(CAMERA_SCALE);
  startWave();
}

function gameUpdate() {
  input = LJS.keyDirection();
  if (input.x != 0 || input.y != 0) {
    const targetAngle = Math.atan2(input.x, input.y);
    let diff = targetAngle - playerAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // accelerate toward target angle
    const accelDir = Math.sign(diff);
    if (Math.abs(diff) > PLAYER_DAMP_THRESHOLD) {
      playerAngleVel += accelDir * PLAYER_ACCEL;
    } else {
      // close enough, damp velocity to avoid overshooting
      playerAngleVel *= PLAYER_DAMP_FACTOR;
      if (Math.abs(diff) < PLAYER_SNAP_THRESHOLD) {
        playerAngle = targetAngle;
        playerAngleVel = 0;
      }
    }
  } else {
    // no input, decelerate smoothly
    playerAngleVel *= PLAYER_FRICTION;
  }

  // clamp to max speed and apply velocity
  playerAngleVel = Math.max(
    -PLAYER_MAX_SPEED,
    Math.min(PLAYER_MAX_SPEED, playerAngleVel),
  );
  playerAngle += playerAngleVel;

  const playerPos = vec2().setAngle(playerAngle, PLAYER_ORBIT_RADIUS);

  // update shoot timer
  if (shootTimer > 0) shootTimer--;

  // shoot toward center with cooldown
  if (LJS.keyIsDown("Space") && shootTimer <= 0) {
    const dirToCenter = playerPos.normalize(-1);
    bullets.push({
      pos: playerPos.copy(),
      vel: dirToCenter.scale(BULLET_SPEED),
    });

    shootTimer = SHOOT_COOLDOWN; // reset cooldown
  }

  // bullets
  bullets.forEach((b) => (b.pos = b.pos.add(b.vel)));
  bullets = bullets.filter((b) => b.pos.length() > BULLET_DESPAWN_RADIUS);

  // --- PATTERN SPAWNING ---
  // spawn patterns instead of single enemies
  if (waveTimer > 0) waveTimer--;
  else {
    // create new pattern if needed
    if (!currentPattern.length || patternIndex >= currentPattern.length) {
      if (enemiesSpawned < enemiesToSpawn) createPattern();
    }

    // spawn next enemy in pattern
    if (currentPattern.length && patternIndex < currentPattern.length) {
      patternTimer--;
      if (patternTimer <= 0) {
        patternTimer = PATTERN_SPACING; // spacing between enemies in pattern

        const data = currentPattern[patternIndex++];
        enemiesSpawned++;

        const angle = data.angle;

        if (data.type === ENEMY_TYPE_LINEAR) {
          const pos = vec2().setAngle(angle, ENEMY_SPAWN_RADIUS);
          const speed = ENEMY_SPEED_BASE_T0 + wave * ENEMY_SPEED_WAVE_SCALE;
          enemies.push({ pos, vel: pos.normalize(-speed) });
        } else if (data.type === ENEMY_TYPE_CENTER) {
          const pos = vec2(0, 0);
          const speed = ENEMY_SPEED_BASE_T1 + wave * ENEMY_SPEED_WAVE_SCALE;
          const vel = vec2().setAngle(angle, speed);
          enemies.push({ pos, vel });
        } else if (data.type === ENEMY_TYPE_SPIRAL) {
          const pos = vec2().setAngle(angle, ENEMY_SPAWN_RADIUS);
          const speed = ENEMY_SPEED_BASE_T2 + wave * ENEMY_SPEED_WAVE_SCALE;
          const vel = pos.normalize(-speed);
          const spin = ENEMY_SPIN_SPEED + wave * ENEMY_SPEED_WAVE_SCALE;
          enemies.push({ pos, vel, angle, spin });
        }
      }
    }
  }

  // update enemies
  enemies.forEach((e) => {
    if (e.spin) {
      e.angle += e.spin;
      const spiral = vec2().setAngle(e.angle, ENEMY_SPIRAL_INTENSITY);
      e.pos = e.pos.add(e.vel).add(spiral);
    } else e.pos = e.pos.add(e.vel);
  });

  // collisions
  enemies = enemies.filter((e) => {
    for (let b of bullets) {
      if (e.pos.distance(b.pos) < COLLISION_RADIUS) return false;
    }
    return true;
  });

  enemies = enemies.filter((e) => e.pos.length() < ENEMY_DESPAWN_RADIUS);

  // --- WAVE CLEAR CHECK ---
  if (
    enemiesSpawned >= enemiesToSpawn &&
    enemies.length === 0 &&
    waveTimer <= 0
  ) {
    if (waveClearedTimer <= 0) waveClearedTimer = WAVE_CLEAR_DELAY;

    waveClearedTimer--;

    if (waveClearedTimer <= 0) {
      wave++;
      startWave();
    }
  }
}

function gameUpdatePost() {}

function gameRender() {
  drawCircle(vec2(0, 0), CORE_RADIUS, COLOR_CORE);

  const playerPos = vec2().setAngle(playerAngle, PLAYER_ORBIT_RADIUS);

  drawCircle(vec2(0, 0), PLAYER_ORBIT_RADIUS * 2, COLOR_ORBIT);

  drawCircle(playerPos, PLAYER_RENDER_SIZE, COLOR_PLAYER);

  const centerDir = playerPos.normalize(-1);
  const tip = playerPos.add(centerDir.scale(PLAYER_TIP_LENGTH));
  drawLine(playerPos, tip, PLAYER_LINE_WIDTH, COLOR_PLAYER_TIP);

  bullets.forEach((b) => drawCircle(b.pos, BULLET_RENDER_SIZE, COLOR_BULLET));
  enemies.forEach((e) => drawCircle(e.pos, ENEMY_RENDER_SIZE, COLOR_ENEMY));
}

function drawUI() {
  drawTextScreen(`Wave ${wave}`, UI_POS_WAVE, UI_SIZE_WAVE);

  const remaining = Math.max(
    0,
    enemiesToSpawn - enemiesSpawned + enemies.length,
  );

  if (
    waveTimer <= 0 &&
    !(enemiesSpawned >= enemiesToSpawn && enemies.length === 0)
  ) {
    drawTextScreen(
      `Enemies Remaining: ${remaining}`,
      UI_POS_REMAINING,
      UI_SIZE_REMAINING,
    );
  }

  if (waveClearedTimer > 0)
    drawTextScreen(
      "WAVE CLEARED",
      LJS.mainCanvasSize.scale(0.5),
      UI_SIZE_CLEARED,
    );

  drawTextScreen(
    `Debug Input: ${input.x}, ${input.y}`,
    UI_POS_DEBUG,
    UI_SIZE_DEBUG,
    UI_COLOR_DEBUG,
  );

  drawTextScreen(
    `Debug Player Angle: ${playerAngle.toFixed(2)}`,
    UI_POS_DEBUG.add(vec2(0, 32)),
    UI_SIZE_DEBUG,
    UI_COLOR_DEBUG,
  );
}

function gameRenderPost() {
  drawUI();
}

LJS.engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
);
