import { WHITE } from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  engine,
  bullet as bulletCfg,
  enemyBullet as enemyBulletCfg,
  bossBullet as bossBulletCfg,
  system,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";

export class Bullet extends BaseEntity {
  constructor(pos, vel, type = "player") {
    let cfg = bulletCfg;
    if (type === "enemy") cfg = enemyBulletCfg;
    if (type === "boss") cfg = bossBulletCfg;

    super(
      pos,
      cfg.sprite,
      cfg.sheet,
      cfg.hitboxScale,
      cfg.size,
      cfg.mirrorX,
      cfg.mirrorY,
    );

    this.velocity = vel;
    this.angle = vel.angle();
    this.renderOrder = 10;
    this.setCollision(true);
    this.type = type;
    this.isEnemy = type !== "player";
    this.mirrorY = cfg.mirrorY !== undefined ? cfg.mirrorY : true;
    this.color = WHITE.copy();

    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.size.length() * 0.5,
      engine.minCollisionRadius,
    );
  }

  update() {
    // Despawn if way outside
    const lx = system.levelSize.x;
    const ly = system.levelSize.y;
    const killMargin = 5;

    if (
      this.pos.x < -killMargin ||
      this.pos.x > lx + killMargin ||
      this.pos.y < -killMargin ||
      this.pos.y > ly + killMargin
    ) {
      this.destroy();
    }
    super.update();
  }

  collideWithObject(other) {
    if (other instanceof Bullet) return false;
    if (other.isBoundary) return false; // Ignore physical collision with boundaries
    return true;
  }
}
