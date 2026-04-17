import {
  vec2,
  EngineObject,
  keyDirection,
  keyIsDown,
  drawTile,
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

    if (input.length() > 0)
      this.velocity = this.velocity.add(
        input.normalize().scale(playerCfg.accel),
      );

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
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, -this.size.y), this.sprite);
    }
  }
}

export function spawnPlayer() {
  player = new Player();
  return player;
}
