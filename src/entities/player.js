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

export let player = null;

export class Player extends EngineObject {
  constructor() {
    const tile = sprites.get(playerCfg.sprite, playerCfg.sheet);
    const visualSize = tile.size.scale(engine.worldScale);
    const hitboxScale = 0.25;

    super(
      vec2(system.levelSize.x / 2, 1),
      visualSize.scale(hitboxScale),
    );
    
    this.visualSize = visualSize;
    this.hp = playerCfg.hp;
    this.sprite = tile;
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
      const halfSprite = this.sprite.size.scale(0.5);
      for (const muzzle of playerCfg.cannonOffsets) {
        const offset = muzzle.subtract(halfSprite).scale(engine.worldScale);
        new Bullet(this.pos.add(offset), vec2(0, bulletCfg.speed), 'player');
      }
      this.shootTimer = playerCfg.shootCooldown;
    }

    super.update();

  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.visualSize.x, -this.visualSize.y), this.sprite, this.color);
    }
  }

  collideWithObject(other) {
    if (other instanceof Enemy || (other instanceof Bullet && other.isEnemy)) {
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
    return true;
  }
}

export function spawnPlayer() {
  player = new Player();
  return player;
}
