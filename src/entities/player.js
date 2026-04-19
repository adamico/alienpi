import {
  vec2,
  keyDirection,
  keyIsDown,
  Color,
  WHITE,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  system,
  engine,
  player as playerCfg,
  bullet as bulletCfg,
} from "../config.js";
import { soundShoot } from "../sounds.js";
import { Bullet } from "./bullet.js";
import { Enemy } from "./enemy.js";
import { BaseEntity } from "./baseEntity.js";

export let player = null;

export class Player extends BaseEntity {
  constructor() {
    super(
      vec2(system.levelSize.x / 2, 1),
      playerCfg.sprite,
      playerCfg.sheet,
      playerCfg.hitboxScale,
      null, // customSize
      playerCfg.mirrorX,
      playerCfg.mirrorY,
    );

    this.hp = playerCfg.hp;
    this.shootTimer = 0;
    this.setCollision(true, true);
    this.mass = 1;
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
      const visualSize = this.visualSize;
      const center = visualSize.scale(0.5);
      for (const muzzle of playerCfg.cannonOffsets) {
        // muzzle is in pixel coordinates, convert to world units
        const muzzleWorld = muzzle.scale(engine.worldScale);

        // Offset from center in world space (Y-up)
        // Pixels are Y-down, so we negate the Y difference
        const offset = vec2(
          muzzleWorld.x - center.x,
          -(muzzleWorld.y - center.y),
        );

        new Bullet(this.pos.add(offset), vec2(0, bulletCfg.speed), "player");
      }
      this.shootTimer = playerCfg.shootCooldown;
    }

    super.update();
  }

  collideWithObject(other) {
    if (other instanceof Enemy || (other instanceof Bullet && other.isEnemy)) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 0, 0); // Flash red
      setTimeout(() => (this.color = WHITE.copy()), 100);

      if (this.hp <= 0) {
        // Simple game over: restart
        location.reload();
      }
      return false;
    }
    return true;
  }
}

export function spawnPlayer() {
  player = new Player();
  return player;
}
