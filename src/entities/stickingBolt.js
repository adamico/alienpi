import {
  vec2,
  Color,
  Timer,
  engineObjectsCallback,
  ParticleEmitter,
  rgb,
  PI,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { system, weapons } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";

/**
 * Short-lived projectile that latches onto the first enemy it touches and
 * deals damage over time. Not a Bullet subclass on purpose — existing enemy
 * collide handlers call other.destroy()/hitTarget() on Bullets, which would
 * break the latch-and-persist behaviour.
 */
export class StickingBolt extends BaseEntity {
  constructor(pos, vel) {
    const cfg = weapons.latch;
    super(
      pos,
      cfg.bullet.sprite,
      cfg.bullet.sheet,
      cfg.bullet.hitboxScale,
      cfg.bullet.size,
      false,
      cfg.bullet.mirrorY,
    );

    this.velocity = vel;
    this.angle = vel.angle();
    this.renderOrder = -1;
    this.setCollision(true, false); // trigger only
    this.mass = 0;
    this.stuckTo = null;
    this.damageFrame = 0;
    this.lifeTimer = new Timer();
    this.stickEmitter = null;
  }

  update() {
    if (this.stuckTo) {
      this.updateStuck();
    } else {
      this.updateTravel();
    }
    super.update();
  }

  updateTravel() {
    // Despawn if it leaves the playfield without hitting anything
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
      return;
    }

    // Non-solid vs non-solid needs a manual sweep — same trick as BossMissile.
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (this.stuckTo || this.destroyed) return;
      if (o === this || o.destroyed) return;
      if (!o.isEnemy || typeof o.hp !== "number") return;
      if (!this.isOverlappingObject(o)) return;
      this.latchTo(o);
    });
  }

  latchTo(target) {
    const cfg = weapons.latch;
    this.stuckTo = target;
    this.velocity = vec2(0);
    this.lifeTimer.set(cfg.lifetime);
    this.damageFrame = 0;

    this.stickEmitter = new ParticleEmitter(
      this.pos,
      0, // angle
      0.2, // emitSize
      0, // emitTime (loop while alive)
      80, // emitRate
      PI, // emitConeAngle
      sprites.get("circle_01.png", system.particleSheetName),
      rgb(1, 0.4, 0.4),
      rgb(1, 0.8, 0.3),
      rgb(1, 0, 0, 0),
      rgb(0.5, 0, 0, 0),
      0.2, // particleTime
      0.4, // sizeStart
      0.05, // sizeEnd
      0.05, // speed
      0.2, // angleSpeed
      0.9, // damping
      0.9, // angleDamping
      0, // gravityScale
      PI, // particleConeAngle
      0.1, // fadeRate
      0.3, // randomness
      false, // collideTiles
      true, // additive
    );
    this.addChild(this.stickEmitter, vec2(0));
  }

  updateStuck() {
    if (this.stuckTo.destroyed) {
      this.destroy();
      return;
    }

    // Follow the target's position directly — sidesteps having to reparent.
    this.pos = this.stuckTo.pos.copy();

    const cfg = weapons.latch;
    this.damageFrame++;
    if (this.damageFrame >= cfg.damageInterval) {
      this.damageFrame = 0;
      this.stuckTo.hp--;
      if (typeof this.stuckTo.applyHitEffect === "function") {
        this.stuckTo.applyHitEffect({
          flashColor: new Color(1, 1, 1),
          duration: 0.05,
        });
      }
      if (this.stuckTo.hp <= 0) {
        this.stuckTo.destroy();
        this.destroy();
        return;
      }
    }

    if (this.lifeTimer.elapsed()) {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    if (this.stickEmitter && !this.stickEmitter.destroyed) {
      this.stickEmitter.emitRate = 0;
    }
    super.destroy();
  }
}
