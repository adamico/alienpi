'use strict';

// import LittleJS module and expose its exports as globals
import * as LJS from "./node_modules/littlejsengine/dist/littlejs.esm.js";
Object.assign(globalThis, LJS);

const G = {
  width: 20,
  height: 20,
  tileSize: 16,
  spritesheet: ['public/assets/sheet.png'],
  playerSprite: 'playerShip1_blue.png',
}

// Global sprite registry
const sprites = new Map();

async function loadSprites(url) {
  const response = await fetch(url);
  const text = await response.text();
  
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const subTextures = xml.getElementsByTagName('SubTexture');

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute('name');
    const x = parseFloat(st.getAttribute('x'));
    const y = parseFloat(st.getAttribute('y'));
    const w = parseFloat(st.getAttribute('width'));
    const h = parseFloat(st.getAttribute('height'));
    
    // Use coordinates directly (LittleJS expect Top-Left Y-down for TileInfo pos)
    sprites.set(name, new TileInfo(vec2(x, y), vec2(w, h), textureInfos[0]));
  }
}

// --- SYSTEM CONFIG ---
const CANVAS_SIZE = vec2(1920, 1080);
const CAMERA_SCALE = 60;

// --- PLAYER SETTINGS ---
const SHOOT_COOLDOWN = 20;

// --- COMBAT SETTINGS ---
const BULLET_SPEED = 0.3;
const BULLET_DESPAWN_RADIUS = 0.5;

// --- RENDER SETTINGS ---
const WORLD_SCALE = 0.015;
const MIN_COLLISION_RADIUS = 0.4;

// --- UI SETTINGS ---

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
    const tile = sprites.get('playerShip1_blue.png');
    super(vec2(0, 0), tile.size.scale(WORLD_SCALE));
    this.shootTimer = 0;
    this.setCollision(true);
  }

  update() {
    // angular input logic
    const input = keyDirection();

    // shooting
    if (this.shootTimer > 0) this.shootTimer--;
    if (keyIsDown("Space") && this.shootTimer <= 0) {
      soundShoot.play();
      const dirToCenter = this.pos.normalize(-1);
      const spawnPos = this.pos.add(dirToCenter.scale(this.size.y / 2));
      // Use facingAngle as the single source of truth
      new Bullet(spawnPos, dirToCenter.scale(BULLET_SPEED));
      this.shootTimer = SHOOT_COOLDOWN;
    }

    super.update();
  }

  render() {
    const tile = sprites.get(G.playerSprite);
    if (tile) {
      drawTile(this.pos, this.size, tile, undefined);
    }
  }
}

class Bullet extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get('laserBlue01.png');
    super(pos, tile.size.scale(WORLD_SCALE));
    this.velocity = vel;
    this.renderOrder = 10;
    this.setCollision(true);
    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(this.size.length() * 0.5, MIN_COLLISION_RADIUS);
  }

  update() {
    if (this.pos.length() < BULLET_DESPAWN_RADIUS) {
      this.destroy();
    }
    super.update();
  }

  render() {
    const tile = sprites.get('laserBlue01.png');
    if (tile) {
      drawTile(this.pos, this.size, tile, undefined);
    }
  }
}

class Enemy extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get('enemyBlack1.png');
    super(pos, tile.size.scale(WORLD_SCALE));
    this.velocity = vel;
    this.setCollision(true);
    // Adjust collision radius for ship proportions
    this.collisionRadius = Math.max(this.size.length() * 0.5, MIN_COLLISION_RADIUS);
  }

  update() {
    super.update();
  }

  render() {
    const tile = sprites.get('enemyBlack1.png');
    if (tile) {
      drawTile(this.pos, this.size, tile, undefined);
    }
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


function startWave() {
}

function drawUI() {
  const input = keyDirection();
  drawTextScreen(
    `Debug Input: ${input.x}, ${input.y}`,
    UI_POS_DEBUG,
    UI_SIZE_DEBUG,
    UI_COLOR_DEBUG,
  );
}

async function gameInit() {
  setCanvasFixedSize(CANVAS_SIZE);
  setCameraPos(vec2(0, 0));
  setCameraScale(CAMERA_SCALE);
  
  // Set tile size to 1 to work with pixel coordinates directly
  setTileDefaultSize(vec2(1));
  
  // Load spritesheet descriptors
  await loadSprites('public/assets/sheet.xml');
  
  player = new Player();
  startWave();
}

function gameUpdate() {}

function gameUpdatePost() {}

function gameRender() {}

function gameRenderPost() {
  drawUI();
}

engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
  G.spritesheet
);
