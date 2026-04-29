import {
  vec2,
  Color,
  rgb,
  engineObjectsCallback,
  Timer,
  EngineObject,
  drawCircle,
  time,
} from "../engine.js";
import * as gameEffects from "../gameEffects.js";
import { system, missile as missileCfg } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { player } from "./player.js";
import { addScore, SCORE } from "../score.js";

/**
 * Homing missile fired by the boss — destroyable by player bullets
 */
export class BossMissile extends BaseEntity {
  /**
   * @param {Vector2} pos
   * @param {Vector2} [initialVel]
   * @param {number} [lifetime]
   */
  constructor(pos, initialVel, lifetime) {
    super(
      pos,
      missileCfg.sprite,
      missileCfg.sheet,
      missileCfg.hitboxScale,
      missileCfg.size,
      false,
      missileCfg.mirrorY,
    );
    this.hp = missileCfg.hp;
    this.velocity = initialVel ?? vec2(0, -missileCfg.speed);
    this.setCollision(true, false);
    this.mass = 0;
    this.isEnemy = true; // so player bullets recognise it
    this.renderOrder = 8;
    this.lifeTimer = new Timer(lifetime ?? missileCfg.lifetime);
    this.explosionCallback = null; // We handle explosion manually in destroy()
  }

  update() {
    if (player && !player.destroyed) {
      const toPlayer = player.pos.subtract(this.pos);
      const dist = toPlayer.length();
      if (dist > 0.1) {
        this.velocity = this.velocity.add(
          toPlayer.normalize().scale(missileCfg.homingStrength),
        );
      }
      // Cap speed
      if (this.velocity.length() > missileCfg.speed) {
        this.velocity = this.velocity.normalize().scale(missileCfg.speed);
      }
      // Rotate sprite to face movement direction
      this.angle = this.velocity.angle();
    }

    // Despawn far outside level
    const killMargin = 8;
    const { x: lx, y: ly } = system.levelSize;
    if (
      this.pos.x < -killMargin ||
      this.pos.x > lx + killMargin ||
      this.pos.y < -killMargin ||
      this.pos.y > ly + killMargin
    ) {
      this.destroy();
    }

    // Lifetime expiry — detonate (Large explosion)
    if (this.lifeTimer.elapsed()) {
      new MissileExplosion(this.pos.copy(), 10);

      this.destroy();
    } else {
      // Warning effect: constant 10Hz blink when 75% of life is gone
      const isRedPhase =
        this.lifeTimer.getPercent() > 0.75 && ((time * 20) | 0) % 2;
      if (isRedPhase) this.color.set(1, 0, 0);
      else this.color.set(1, 1, 1);
    }

    super.update();

    // Both BossMissile and player Bullet are non-solid triggers; the engine
    // skips collision events between two non-solid objects.  Manually sweep
    // for overlapping player bullets the same way BossOrbiter does.
    if (!this.destroyed) {
      engineObjectsCallback(this.pos, this.size, (o) => {
        if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
          this.collideWithObject(o);
          o.collideWithObject(this);
        }
      });
    }
  }

  collideWithObject(other) {
    if (this.destroyed) return false;

    // Shot down by player bullet
    if (other.isBullet && !other.isEnemy) {
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 1), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.15, 0.1));
      this.applyEffect(new gameEffects.KnockbackEffect(other.velocity, 0.1));
      if (this.hp <= 0) {
        addScore(SCORE.missile);
        new MissileExplosion(this.pos.copy(), 3);
        this.destroy();
      }
      return false;
    }
    // Collided with player ship
    if (other === player) {
      gameEffects.explode(this.pos, this.size.x);
      this.destroy();
      return false;
    }
    return false;
  }
}

/**
 * Explosion zone spawned.
 * Lasts one frame, custom size — damages the player on contact.
 */
class MissileExplosion extends EngineObject {
  constructor(pos, diameter = 10) {
    super(pos, vec2(diameter));
    this.setCollision(true, false);
    this.mass = 0;
    this.isEnemy = true;
    this.noDestroyOnImpact = true; // self-manages lifetime via lingerTimer
    this.renderOrder = 100; // Draw on top of everything

    // --- Tweakable Animation Variables ---
    this.duration = 0.5; // Total time visible
    this.pWhite = 0.15; // End of white phase (% of duration)
    this.pRed = 0.4; // End of red transition (% of duration)
    this.maxAlpha = 0.6; // Transparency at peak
    // --------------------------------------

    this.lingerTimer = new Timer(this.duration);
    this.timeAlive = 0;

    gameEffects.missileExplode(this.pos, diameter);
  }

  render() {
    const p = this.timeAlive / this.duration;
    let color;

    if (p < this.pWhite) {
      // Stage 1: Pure White Flash (no transparency)
      color = rgb(1, 1, 1, 1);
    } else if (p < this.pRed) {
      // Stage 2: Fade White to Red
      const t = (p - this.pWhite) / (this.pRed - this.pWhite);
      color = rgb(1, 1 - t, 1 - t, this.maxAlpha);
    } else {
      // Stage 3: Fade Red to Black (Transparent)
      const t = (p - this.pRed) / (1 - this.pRed);
      color = rgb(Math.max(0, 1 - t), 0, 0, this.maxAlpha * (1 - t));
    }

    drawCircle(this.pos, this.size.x, color);
  }

  update() {
    super.update();
    this.timeAlive += 1 / 60;

    // Disable collision after first frame to keep it a one-time blast
    if (this.timeAlive > 0.02) {
      this.setCollision(false, false);
    }

    if (this.lingerTimer.elapsed()) {
      this.destroy();
    }
  }
}
