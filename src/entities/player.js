import {
  vec2,
  EngineObject,
  keyDirection,
  keyIsDown,
  drawTile,
  Color,
  WHITE,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  system,
  engine,
  player as playerCfg,
  bullet as bulletCfg,
} from "../config.js";
import { sprites } from "../sprites.js";
import { soundShoot } from "../sounds.js";
import { Bullet } from "./bullet.js";
import { Enemy } from "./enemy.js";
import { Boss } from "./boss.js";

export let player = null;

export class Player extends EngineObject {
  constructor() {
    const tile = sprites.get(playerCfg.sprite);
    super(
      vec2(system.levelSize.x / 2, 0.5),
      tile.size.scale(engine.worldScale),
    );
    this.sprite = tile;
    this.shootTimer = 0;
    this.setCollision(true);
    this.mass = 0;
    this.damping = playerCfg.damping;
  }

  update() {
    const input = keyDirection();

    if (input.length() > 0) {
      this.velocity = this.velocity.add(
        input.normalize().scale(playerCfg.accel),
      );
    }

    const maxSpeed = keyIsDown(system.focusKey)
      ? engine.objectMaxSpeed * playerCfg.focusSpeedScale
      : engine.objectMaxSpeed;
    if (this.velocity.length() > maxSpeed)
      this.velocity = this.velocity.normalize().scale(maxSpeed);

    // shooting
    if (this.shootTimer > 0) this.shootTimer--;
    if (keyIsDown(system.shootKey) && this.shootTimer <= 0) {
      soundShoot.play();
      const halfSprite = this.sprite.size.scale(0.5);
      for (const muzzle of playerCfg.cannonOffsets) {
        const offset = muzzle.subtract(halfSprite).scale(engine.worldScale);
        new Bullet(this.pos.add(offset), vec2(0, bulletCfg.speed));
      }
      this.shootTimer = playerCfg.shootCooldown;
    }

    super.update();

    // Clamp to screen
    const margin = 0.5;
    this.pos.x = Math.max(margin, Math.min(system.levelSize.x - margin, this.pos.x));
    this.pos.y = Math.max(margin, Math.min(15, this.pos.y)); // Keep in bottom half-ish
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, -this.size.y), this.sprite, this.color);
    }
  }

  collideWithObject(other) {
    if (other instanceof Enemy || other instanceof Boss || (other instanceof Bullet && other.isEnemy)) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 0, 0); // Flash red
      setTimeout(() => this.color = WHITE.copy(), 100);
      
      if (this.hp <= 0) {
        // Simple game over: restart
        location.reload();
      }
      return false;
    }
    return false;
  }
}

export function spawnPlayer() {
  player = new Player();
  return player;
}
