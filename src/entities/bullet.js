import {
  vec2,
  EngineObject,
  drawTile,
  WHITE,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, bullet as bulletCfg, system } from "../config.js";
import { sprites } from "../sprites.js";

export class Bullet extends EngineObject {
  constructor(pos, vel) {
    const tile = sprites.get(bulletCfg.sprite);
    super(pos, tile.size.scale(engine.worldScale));
    this.sprite = tile;
    this.velocity = vel;
    this.renderOrder = 10;
    this.setCollision(true);
    this.isEnemy = false;
    this.color = WHITE.copy();
    
    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      engine.minCollisionRadius,
    );
  }

  update() {
    // Despawn if outside level
    if (this.pos.y > system.levelSize.y * 2 || this.pos.y < -system.levelSize.y) {
      this.destroy();
    }
    super.update();
  }

  render() {
    if (this.sprite) {
      const drawSize = this.isEnemy ? vec2(this.size.x, -this.size.y) : vec2(this.size.x, this.size.y);
      drawTile(this.pos, drawSize, this.sprite, this.color);
    }
  }
}