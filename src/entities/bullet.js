import {
  WHITE,
  ParticleEmitter,
  rgb,
} from "../engine.js";
import {
  engine,
  weapons,
  enemyBullet as enemyBulletCfg,
  bossBullet as bossBulletCfg,
  system,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { recordDamage } from "../dpsTracker.js";

export class Bullet extends BaseEntity {
  constructor(pos, vel, type = "player", cfg = null, damage = 1) {
    let finalCfg = cfg;
    if (!finalCfg) {
      if (type === "enemy") finalCfg = enemyBulletCfg;
      else if (type === "boss") finalCfg = bossBulletCfg;
      else finalCfg = weapons.vulcan.bullet;
    }

    super(
      pos,
      finalCfg.sprite,
      finalCfg.sheet,
      finalCfg.hitboxScale,
      finalCfg.size,
      finalCfg.mirrorX,
      finalCfg.mirrorY,
    );

    this.velocity = vel;
    this.angle = type === "player" ? 0 : vel.angle();
    this.renderOrder = type === "player" ? -1 : 10;
    this.setCollision(true, false); // Trigger only, not solid
    this.mass = 0; // Projectiles shouldn't have mass-based physics response
    this.type = type;
    this.isEnemy = type !== "player";
    this.isBullet = true;
    this.mirrorY = finalCfg.mirrorY !== undefined ? finalCfg.mirrorY : true;
    this.color = WHITE.copy();
    this.pierce = 0;
    this.hitTargets = null;
    this.damage = damage;
    this.weaponKey = null;

    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.visualSize.length() * 0.5,
      engine.minCollisionRadius,
    );

    this.playDestroySound = false;
  }

  /**
   * Called by a target when this bullet collides with it. Returns one of:
   *   "ignore"  — target was already hit by this bullet; no damage this frame.
   *   "damage"  — apply damage; bullet keeps travelling (pierce remaining).
   *   "destroy" — apply damage; caller must call bullet.destroy().
   * The bullet remembers which targets it has already hit so a pierce'd
   * shot doesn't tick damage every frame it overlaps a single target.
   */
  hitTarget(target) {
    if (this.hitTargets && this.hitTargets.has(target)) return "ignore";
    if (!this.hitTargets) this.hitTargets = new Set();
    this.hitTargets.add(target);
    recordDamage(this.weaponKey, this.damage, target);
    if (this.pierce > 0) {
      this.pierce--;
      return "damage";
    }
    return "destroy";
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

  destroy() {
    if (this.destroyed) return;
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
    super.destroy();
  }

  collideWithObject(other) {
    if (other.isBullet) return false;
    if (other.isBoundary) return false;
    if (this.type === "player" && other.isPlayer) return false;
    return true;
  }
}
