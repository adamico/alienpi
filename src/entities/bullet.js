import {
  vec2,
  EngineObject,
  drawTile,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, bullet as bulletCfg } from "../config.js";
import { sprites } from "../sprites.js";

export class Bullet extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get(bulletCfg.sprite);
    super(pos, tile.size.scale(engine.worldScale));
    this.sprite = tile;
    this.velocity = vel;
    this.renderOrder = 10;
    this.setCollision(true);
    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      engine.minCollisionRadius,
    );
  }

  update() {
    if (this.pos.length() < bulletCfg.despawnRadius) {
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