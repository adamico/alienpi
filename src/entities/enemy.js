import {
  vec2,
  EngineObject,
  drawTile,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, enemy as enemyCfg } from "../config.js";
import { sprites } from "../sprites.js";
import { Bullet } from "./bullet.js";

export class Enemy extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get(enemyCfg.sprite);
    super(pos, tile.size.scale(engine.worldScale));
    this.sprite = tile;
    this.velocity = vel;
    this.setCollision(true);
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      engine.minCollisionRadius,
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