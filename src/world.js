import { vec2 } from "./engine.js";
import { system } from "./config.js";
import { spawnPlayer } from "./entities/player.js";
import { Boss } from "./entities/boss.js";

let player = null;
let currentBoss = null;
let gameTime = 0;

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
