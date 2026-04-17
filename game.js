"use strict";

// import LittleJS module
import * as LJS from "./node_modules/littlejsengine/dist/littlejs.esm.js";

const {
  vec2,
  rgb,
  rand,
  randInt,
  drawCircle,
  drawLine,
  drawTextScreen,
  Sound,
  EngineObject,
} = LJS;

// --- SYSTEM CONFIG ---
const CANVAS_SIZE = vec2(1920, 1080);
const CAMERA_SCALE = 60;

// --- PLAYER SETTINGS ---
const PLAYER_ORBIT_RADIUS = 8;
const PLAYER_MAX_SPEED = 0.04;
const PLAYER_ACCEL = 0.005;
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
const BULLET_RENDER_SIZE = 0.6;
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

// --- SOUND GENERATOR ---
// eslint-disable-next-line no-unused-vars
class SoundGenerator extends Sound {
  constructor(params = {}) {
    const {
      volume = 1,
      randomness = 0.1,
      frequency = 220,
      attack = 0,
      release = 0.1,
      shapeCurve = 1,
      slide = 0,
      pitchJump = 0,
      pitchJumpTime = 0,
      repeatTime = 0,
      noise = 0,
      bitCrush = 0,
      delay = 0,
    } = params;

    super([
      volume,
      randomness,
      frequency,
      attack,
      0,
      release,
      0,
      shapeCurve,
      slide,
      0,
      pitchJump,
      pitchJumpTime,
      repeatTime,
      noise,
      0,
      bitCrush,
      delay,
      1,
      0,
      0,
      0,
    ]);
  }
}

// --- SOUNDS ---
/* eslint-disable no-sparse-arrays */
// Shoot 47
const soundShoot = new Sound([.2,,165,.02,.13,.08,5,1.8,20,23,,,,,,,.07,.88,.06]);
/* eslint-enable no-sparse-arrays */

// --- CLASSES ---

class Player extends EngineObject {
  constructor() {
    super(vec2(0, PLAYER_ORBIT_RADIUS), vec2(PLAYER_RENDER_SIZE));
    this.angle = 0;
    this.angleVel = 0;
    this.shootTimer = 0;
    this.setCollision(true);
  }

  update() {
    // angular input logic
    const input = LJS.keyDirection();
    if (input.x != 0 || input.y != 0) {
      const targetAngle = Math.atan2(input.x, input.y);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const accelDir = Math.sign(diff);
      if (Math.abs(diff) > PLAYER_DAMP_THRESHOLD) {
        this.angleVel += accelDir * PLAYER_ACCEL;
      } else {
        this.angleVel *= PLAYER_DAMP_FACTOR;
        if (Math.abs(diff) < PLAYER_SNAP_THRESHOLD) {
          this.angle = targetAngle;
          this.angleVel = 0;
        }
      }
    } else {
      this.angleVel *= PLAYER_DAMP_FACTOR;
    }

    // clamp angle velocity
    this.angleVel = Math.max(
      -PLAYER_MAX_SPEED,
      Math.min(PLAYER_MAX_SPEED, this.angleVel),
    );
    this.angle += this.angleVel;

    // sync position using engine velocity system (tangent velocity)
    const targetPos = vec2().setAngle(this.angle, PLAYER_ORBIT_RADIUS);
    this.velocity = targetPos.subtract(this.pos);

    // shooting
    if (this.shootTimer > 0) this.shootTimer--;
    if (LJS.keyIsDown("Space") && this.shootTimer <= 0) {
      soundShoot.play();
      const dirToCenter = this.pos.normalize(-1);
      const spawnPos = this.pos.add(dirToCenter.scale(PLAYER_RENDER_SIZE));
      new Bullet(spawnPos, dirToCenter.scale(BULLET_SPEED));
      this.shootTimer = SHOOT_COOLDOWN;
    }

    super.update();
  }

  render() {
    drawCircle(this.pos, PLAYER_RENDER_SIZE, COLOR_PLAYER);
    const centerDir = this.pos.normalize(-1);
    const tip = this.pos.add(centerDir.scale(PLAYER_TIP_LENGTH));
    drawLine(this.pos, tip, PLAYER_LINE_WIDTH, COLOR_PLAYER_TIP);
  }
}

class Bullet extends EngineObject {
  constructor(pos, vel) {
    super(pos, vec2(BULLET_RENDER_SIZE), undefined, 0, COLOR_BULLET);
    this.velocity = vel;
    this.renderOrder = 10;
    this.setCollision(true);
  }

  update() {
    if (this.pos.length() < BULLET_DESPAWN_RADIUS) {
      this.destroy();
    }
    super.update();
  }

  render() {
    drawCircle(this.pos, BULLET_RENDER_SIZE, COLOR_BULLET);
  }
}

class Enemy extends EngineObject {
  constructor(pos, vel, type, data = {}) {
    super(pos, vec2(COLLISION_RADIUS * 2), undefined, 0, COLOR_ENEMY);
    this.velocity = vel;
    this.enemyType = type;
    this.spin = data.spin;
    this.angle = data.angle;
    this.setCollision(true);
  }

  update() {
    if (this.spin) {
      this.angle += this.spin;
      const spiral = vec2().setAngle(this.angle, ENEMY_SPIRAL_INTENSITY);
      this.pos = this.pos.add(spiral); // spiral is addition on top of base velocity
    }

    if (this.pos.length() > ENEMY_DESPAWN_RADIUS) {
      this.destroy();
    }
    super.update();
  }

  render() {
    drawCircle(this.pos, ENEMY_RENDER_SIZE, COLOR_ENEMY);
  }

  collideWithObject(other) {
    if (other instanceof Bullet) {
      this.destroy();
      other.destroy();
      return false; // non-solid collision
    }
    return false;
  }
}

// --- STATE ---
let player;
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

function drawUI() {
  drawTextScreen(`Wave ${wave}`, UI_POS_WAVE, UI_SIZE_WAVE);

  // Count active enemies
  let enemyCount = 0;
  LJS.engineObjects.forEach((o) => {
    if (o instanceof Enemy) enemyCount++;
  });

  const remaining = Math.max(0, enemiesToSpawn - enemiesSpawned + enemyCount);

  if (
    waveTimer <= 0 &&
    !(enemiesSpawned >= enemiesToSpawn && enemyCount === 0)
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

  const input = LJS.keyDirection();
  drawTextScreen(
    `Debug Input: ${input.x}, ${input.y}`,
    UI_POS_DEBUG,
    UI_SIZE_DEBUG,
    UI_COLOR_DEBUG,
  );

  if (player) {
    drawTextScreen(
      `Debug Player Angle: ${player.angle.toFixed(2)}`,
      UI_POS_DEBUG.add(vec2(0, 32)),
      UI_SIZE_DEBUG,
      UI_COLOR_DEBUG,
    );
  }
}

async function gameInit() {
  LJS.setCanvasFixedSize(CANVAS_SIZE);
  LJS.setCameraPos(vec2(0, 0));
  LJS.setCameraScale(CAMERA_SCALE);
  player = new Player();
  startWave();
}

function gameUpdate() {
  // --- PATTERN SPAWNING ---
  if (waveTimer > 0) waveTimer--;
  else {
    if (!currentPattern.length || patternIndex >= currentPattern.length) {
      if (enemiesSpawned < enemiesToSpawn) createPattern();
    }

    if (currentPattern.length && patternIndex < currentPattern.length) {
      patternTimer--;
      if (patternTimer <= 0) {
        patternTimer = PATTERN_SPACING;

        const data = currentPattern[patternIndex++];
        enemiesSpawned++;

        const angle = data.angle;
        const speedScale = wave * ENEMY_SPEED_WAVE_SCALE;

        if (data.type === ENEMY_TYPE_LINEAR) {
          const pos = vec2().setAngle(angle, ENEMY_SPAWN_RADIUS);
          const velocity = pos.normalize(-(ENEMY_SPEED_BASE_T0 + speedScale));
          new Enemy(pos, velocity, ENEMY_TYPE_LINEAR);
        } else if (data.type === ENEMY_TYPE_CENTER) {
          const pos = vec2(0, 0);
          const velocity = vec2().setAngle(
            angle,
            ENEMY_SPEED_BASE_T1 + speedScale,
          );
          new Enemy(pos, velocity, ENEMY_TYPE_CENTER);
        } else if (data.type === ENEMY_TYPE_SPIRAL) {
          const pos = vec2().setAngle(angle, ENEMY_SPAWN_RADIUS);
          const velocity = pos.normalize(-(ENEMY_SPEED_BASE_T2 + speedScale));
          const spin = ENEMY_SPIN_SPEED + speedScale;
          new Enemy(pos, velocity, ENEMY_TYPE_SPIRAL, { angle, spin });
        }
      }
    }
  }

  // Count active enemies
  let enemyCount = 0;
  LJS.engineObjects.forEach((o) => {
    if (o instanceof Enemy) enemyCount++;
  });

  // --- WAVE CLEAR CHECK ---
  if (enemiesSpawned >= enemiesToSpawn && enemyCount === 0 && waveTimer <= 0) {
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
  drawCircle(vec2(0, 0), PLAYER_ORBIT_RADIUS * 2, COLOR_ORBIT);
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
