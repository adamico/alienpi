"use strict";

import {
  vec2,
  rgb,
  TileInfo,
  textureInfos,
  Sound,
  EngineObject,
  keyDirection,
  keyIsDown,
  drawTile,
  drawRect,
  drawTextScreen,
  setCanvasFixedSize,
  setCameraPos,
  setTileDefaultSize,
  engineInit,
} from "./node_modules/littlejsengine/dist/littlejs.esm.js";

// --- SYSTEM CONFIG ---
const CANVAS_SIZE = vec2(1280, 720);
const LEVEL_SIZE = vec2(20, 20);
const ASSET_PATH = "public/assets/";
const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
const SPRITE_SHEET_PATH = `${ASSET_PATH}${SPRITE_SHEET_NAME}`;
const G = {
  levelSize: LEVEL_SIZE,
  canvasSize: CANVAS_SIZE,
  cameraPos: LEVEL_SIZE.scale(0.5),
  spriteSheet: [`${SPRITE_SHEET_PATH}.png`],
  playerSprite: "spaceShips_008.png",
  playerBulletSprite: "spaceMissiles_001.png",
  shootKey: "Space",
};

// Global sprite registry
const sprites = new Map();

async function loadSprites() {
  const xmlUrl = `${SPRITE_SHEET_PATH}.xml`;
  const response = await fetch(xmlUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const subTextures = xml.getElementsByTagName("SubTexture");

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute("name");
    const x = parseFloat(st.getAttribute("x"));
    const y = parseFloat(st.getAttribute("y"));
    const w = parseFloat(st.getAttribute("width"));
    const h = parseFloat(st.getAttribute("height"));

    // Use coordinates directly (LittleJS expect Top-Left Y-down for TileInfo pos)
    sprites.set(name, new TileInfo(vec2(x, y), vec2(w, h), textureInfos[0]));
  }
}

// --- PLAYER SETTINGS ---
const SHOOT_COOLDOWN = 10;

// --- COMBAT SETTINGS ---
const BULLET_SPEED = 0.3;
const BULLET_DESPAWN_RADIUS = 0.5;

// Removed unused global player variable

// --- RENDER SETTINGS ---
const WORLD_SCALE = 0.02;
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
const soundShoot = new Sound([
  0.2,
  ,
  165,
  0.02,
  0.13,
  0.08,
  5,
  1.8,
  20,
  23,
  ,
  ,
  ,
  ,
  ,
  ,
  0.07,
  0.88,
  0.06,
]);
/* eslint-enable no-sparse-arrays */

// --- CLASSES ---

export let player = null;
class Player extends EngineObject {
  constructor() {
    const tile = sprites.get(G.playerSprite);
    super(vec2(G.levelSize.x / 2, 1.2), tile.size.scale(WORLD_SCALE));
    this.sprite = tile;
    this.shootTimer = 0;
    this.setCollision(true);
    this.mass = 0;
  }

  update() {
    // angular input logic
    const input = keyDirection();

    // shooting
    if (this.shootTimer > 0) this.shootTimer--;
    if (keyIsDown(G.shootKey) && this.shootTimer <= 0) {
      soundShoot.play();
      const shootOffset = vec2(0.5, -0.1);
      const bulletSpawnPos1 = this.pos.add(
        vec2(-this.size.x / 2 + shootOffset.x, this.size.y / 2 + shootOffset.y),
      );
      const bulletSpawnPos2 = this.pos.add(
        vec2(this.size.x / 2 - shootOffset.x, this.size.y / 2 + shootOffset.y),
      );
      new Bullet(bulletSpawnPos1, vec2(0, BULLET_SPEED));
      new Bullet(bulletSpawnPos2, vec2(0, BULLET_SPEED));
      this.shootTimer = SHOOT_COOLDOWN;
    }

    super.update();
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, -this.size.y), this.sprite);
    }
  }
}

class Bullet extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get(G.playerBulletSprite);
    super(pos, tile.size.scale(WORLD_SCALE));
    this.sprite = tile;
    this.velocity = vel;
    this.renderOrder = 10;
    this.setCollision(true);
    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      MIN_COLLISION_RADIUS,
    );
  }

  update() {
    if (this.pos.length() < BULLET_DESPAWN_RADIUS) {
      this.destroy();
    }
    super.update();
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, this.size.y), this.sprite);
    }
  }
}

class Enemy extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get("enemyBlack1.png");
    super(pos, tile.size.scale(WORLD_SCALE));
    this.sprite = tile;
    this.velocity = vel;
    this.setCollision(true);
    // Adjust collision radius for ship proportions
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      MIN_COLLISION_RADIUS,
    );
  }

  update() {
    super.update();
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, -this.size.y), this.sprite);
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
  setCameraPos(G.cameraPos);

  // Set tile size to 1 to work with pixel coordinates directly
  setTileDefaultSize(vec2(1));

  // Load spritesheet descriptors
  await loadSprites();

  // Create player instance (local variable, not assigned globally)
  player = new Player();
}

function gameUpdate() {}

function gameUpdatePost() {}

function gameRender() {
  drawRect(G.cameraPos, vec2(100), rgb(0.5, 0.5, 0.5)); // Background
  drawRect(G.cameraPos, G.levelSize, rgb(0.1, 0.1, 0.1));
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
  G.spriteSheet,
);
