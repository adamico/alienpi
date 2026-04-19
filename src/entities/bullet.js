import {
  vec2,
  EngineObject,
  drawTile,
  WHITE,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, bullet as bulletCfg, enemyBullet as enemyBulletCfg, system } from "../config.js";
import { sprites } from "../sprites.js";

export class Bullet extends EngineObject {
  constructor(pos, vel, isEnemy = false) {
    const cfg = isEnemy ? enemyBulletCfg : bulletCfg;
    const tile = sprites.get(cfg.sprite, cfg.sheet);
    super(pos, cfg.size);
    
    this.sprite = tile;
    this.velocity = vel;
    this.angle = vel.angle();
    this.renderOrder = 10;
    this.setCollision(true);
    this.isEnemy = isEnemy;
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
      drawTile(this.pos, this.size, this.sprite, this.color, this.angle);
    }
  }
}