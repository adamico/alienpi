import { vec2 } from "./engine.js";
import { system, GAME_STATES } from "./config/index.js";
import { spawnPlayer } from "./entities/player.js";
import { Boss } from "./entities/boss.js";

let player = null;
let currentBoss = null;
let gameTime = 0;
let gameState = GAME_STATES.TITLE;
let gameWon = false;
let lastRunDebrief = null;

export function getPlayer() {
  return player;
}

export function getCurrentBoss() {
  return currentBoss;
}

export function getGameTime() {
  return gameTime;
}

export function initializePlayer() {
  player = spawnPlayer();
  return player;
}

export function spawnBoss() {
  currentBoss = new Boss(vec2(system.levelSize.x / 2, system.levelSize.y - 4));
  return currentBoss;
}

export function tickGameTime(dt) {
  gameTime += dt;
}

export function resetGameTime() {
  gameTime = 0;
}

export function getGameState() {
  return gameState;
}

export function setGameState(state) {
  gameState = state;
}

export function getGameWon() {
  return gameWon;
}

export function setGameWon(value) {
  gameWon = value;
}

export function getLastRunDebrief() {
  return lastRunDebrief;
}

export function setLastRunDebrief(value) {
  lastRunDebrief = value;
}
