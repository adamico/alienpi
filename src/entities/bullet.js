import {
  WHITE,
  ParticleEmitter,
  TileInfo,
  rgb,
  vec2,
  time,
} from "../engine.js";
import {
  engine,
  weapons,
  enemyBullet as enemyBulletCfg,
  bossBullet as bossBulletCfg,
  system,
} from "../config/index.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../visuals/sprites.js";
import { recordDamage } from "../game/dpsTracker.js";
import { TrailEffect, spawnPierceEffect } from "../visuals/gameEffects.js";

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

    this.projectileVelocity = vel;
    this.velocity = vec2(0);
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
    this.spawnTime = time;
    this.renderCfg = finalCfg.render || null;

    // Ensure small bullets are still easy to hit
    this.collisionRadius = Math.max(
      this.visualSize.length() * 0.5,
      engine.minCollisionRadius,
    );

    this.explodeOnDestroy = false;

    // Apply effects based on config
    if (finalCfg.trailLength) {
      this.applyEffect(new TrailEffect(finalCfg.trailLength));
    }

    // Sprite-strip animation: split a horizontal Nx1 strip into per-frame tiles
    // and advance through them at animFps. The strip is loaded as a single
    // TileInfo by loadDynamicSpritesheet, so derive a frame-0 sub-tile here.
    // Sprite-strip animation. The strip is packed via loadDynamicSpritesheet,
    // which shrinks the loaded tile by 1px on each side for bleed prevention,
    // so we can't just divide that tile evenly. Instead, take the original
    // packed origin (baseTile.pos minus the 1px bleed) and build per-frame
    // TileInfos at the configured frameSize, each with their own 1px bleed.
    if (finalCfg.animFrames && this.sprite) {
      const baseTile = this.sprite;
      const frameSize = finalCfg.animFrameSize;
      const bleed = 1;
      const origin = baseTile.pos.subtract(vec2(bleed));
      this.animFrameTiles = [];
      for (let i = 0; i < finalCfg.animFrames; i++) {
        this.animFrameTiles.push(
          new TileInfo(
            vec2(origin.x + i * frameSize.x + bleed, origin.y + bleed),
            vec2(frameSize.x - bleed * 2, frameSize.y - bleed * 2),
            baseTile.textureInfo,
          ),
        );
      }
      this.animFps = finalCfg.animFps ?? 12;
      // Recompute visual size against per-frame aspect.
      const w = this.visualSize.x;
      const aspect = frameSize.y / frameSize.x;
      this.visualSize = vec2(w, w * aspect);
      this.size = this.visualSize.scale(this.hitboxScale);
      this.sprite = this.animFrameTiles[0];
    }

    // 2-frame x-axis squish to fake Y-axis spin.
    if (finalCfg.squishHz) {
      this.squishHz = finalCfg.squishHz;
      this.squishScale = finalCfg.squishScale ?? 0.4;
      this.baseVisualWidth = this.visualSize.x;
    }
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
    if (this.destroyed) return "ignore";
    if (this.hitTargets && this.hitTargets.has(target)) return "ignore";
    if (!this.hitTargets) this.hitTargets = new Set();
    this.hitTargets.add(target);
    recordDamage(this.weaponKey, this.damage, target);
    if (this.pierce > 0) {
      this.pierce--;
      spawnPierceEffect(target.pos, this.velocity.angle(), target.size.x);
      return "damage";
    }
    this.destroy(true);
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

    // Manually move based on our velocity to bypass the engine's 0.4 clamp.
    this.pos = this.pos.add(this.projectileVelocity);

    if (this.squishHz) {
      const tick = Math.floor((time - this.spawnTime) * this.squishHz) & 1;
      this.visualSize.x = tick
        ? this.baseVisualWidth * this.squishScale
        : this.baseVisualWidth;
    }

    if (this.animFrameTiles) {
      const f =
        Math.floor((time - this.spawnTime) * this.animFps) %
        this.animFrameTiles.length;
      this.sprite = this.animFrameTiles[f];
    }
    super.update();
  }

  destroy() {
    if (this.destroyed) return;
    if (this.type === "player") {
      // Cooldown reset mechanic for Vulcan bullets
      if (this.weaponKey === "vulcan" && this.player) {
        // Only decrement the active count for the FIRST bullet of the volley to hit/despawn.
        // This ensures a constant rhythm even if some bullets in a volley miss.
        if (this.volleyState && !this.volleyState.decremented) {
          this.volleyState.decremented = true;
          this.player.activeVulcanBullets--;

          // If it was a close hit, add a firing delay to maintain a steady rate
          const cfg = weapons.vulcan;
          const dist = this.pos.distance(this.player.pos);
          if (dist < cfg.closeRangeThreshold) {
            const level = this.player.weaponLevels.vulcan;
            const lifeFrames = (time - this.spawnTime) * 60;
            const targetInterval = cfg.closeRangeCooldown[level - 1];
            const extraDelay = Math.max(0, targetInterval - lifeFrames);

            this.player.shootTimer = Math.max(
              this.player.shootTimer,
              extraDelay,
            );
          }

          this.player.updateShooting(); // Check for immediate fire
        }
        this.player = null; // Prevent double decrement
      }

      // TODO: move to gameEffects
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
