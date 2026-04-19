import {
  EngineObject,
  drawTile,
  WHITE,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, bullet as bulletCfg, enemyBullet as enemyBulletCfg, bossBullet as bossBulletCfg, system } from "../config.js";
import { sprites } from "../sprites.js";

export class Bullet extends EngineObject {
  constructor(pos, vel, type = 'player') {
    let cfg = bulletCfg;
    if (type === 'enemy') cfg = enemyBulletCfg;
    if (type === 'boss') cfg = bossBulletCfg;
    const size = sprites.getSize(cfg.sprite, cfg.sheet, cfg.size);
    
    super(pos, size);
    
    this.sprite = sprites.get(cfg.sprite, cfg.sheet);
    this.velocity = vel;
    this.angle = vel.angle();
    this.renderOrder = 10;
    this.setCollision(true);
    this.type = type;
    this.isEnemy = (type !== 'player');
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

  collideWithObject(other) {
    if (other instanceof Bullet) return false;
    return true;
  }
}