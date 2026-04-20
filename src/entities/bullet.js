import {
  WHITE,
  ParticleEmitter,
  rgb,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  engine,
  bullet as bulletCfg,
  enemyBullet as enemyBulletCfg,
  bossBullet as bossBulletCfg,
  system,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";

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
    this.angle = type === "player" ? 0 : vel.angle();
    this.renderOrder = type === "player" ? -1 : 10;
    this.setCollision(true, false); // Trigger only, not solid
    this.mass = 0; // Projectiles shouldn't have mass-based physics response
    this.type = type;
    this.isEnemy = type !== "player";
    this.mirrorY = cfg.mirrorY !== undefined ? cfg.mirrorY : true;
    this.color = WHITE.copy();

    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.visualSize.length() * 0.5,
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
    if (other.isBoundary) return false;
    if (this.type === "player" && other.isPlayer) return false;

    if (this.type === "player") {
      new ParticleEmitter(
        this.pos,
        0, // angle
        0.1, // emitSize
        0.1, // emitTime
        20, // emitRate
        Math.PI, // emitConeAngle
        sprites.get("circle_01.png", system.particleSheetName),
        rgb(1, 1, 1), // colorStartA
        rgb(1, 1, 1), // colorStartB
        rgb(0.2, 0.2, 0.2, 0), // colorEndA
        rgb(0.1, 0.1, 0.1, 0), // colorEndB
        0.2, // particleTime
        1.5, // sizeStart
        0.1, // sizeEnd
        0.05, // speed
        0.1, // angleSpeed
        0.85, // damping
        0.8, // angleDamping
        0, // gravityScale
        Math.PI, // particleConeAngle
        0.2, // fadeRate
        0.3, // randomness
        false, // collideTiles
        true, // additive
      );
    }

    return true;
  }
}
