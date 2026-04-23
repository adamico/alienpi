import {
  vec2,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
  engineObjectsCallback,
  Timer,
  EngineObject,
  drawCircle,
  drawLine,
  time,
  lerp,
} from "../engine.js";
import * as gameEffects from "../gameEffects.js";
import {
  system,
  boss as bossCfg,
  beam as beamCfg,
  orbiter as orbCfg,
  missile as missileCfg,
  shield as shieldCfg,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { player } from "./player.js";
import { soundBossBeam } from "../sounds.js";

/**
 * Defensive pods that orbit the boss
 */
export class BossOrbiter extends BaseEntity {
  constructor(initialAngle) {
    super(
      vec2(), // pos overridden by parent transform
      orbCfg.sprite,
      orbCfg.sheet,
      orbCfg.hitboxScale,
      orbCfg.size,
      orbCfg.mirrorX,
      orbCfg.mirrorY,
    );
    this.angleOffset = initialAngle;
    this.hp = orbCfg.hp;
    this.color = orbCfg.color.copy();
    this.mass = 0;
    this.isSolid = false;
    this.setCollision(false, false); // No collision while appearing
    this.renderOrder = -1; // Render below the boss
    this.state = "appearing";
    this.appearTimer = new Timer(orbCfg.appearTime);
    this.diveTimer = new Timer(
      rand(orbCfg.diveRate * 0.5, orbCfg.diveRate * 1.5) / 60,
    );
    this.warningTimer = new Timer();
    this.tetherColor = this.color.copy();
    this.workingPos = vec2();
    this.isEnemy = true;
  }

  update() {
    if (!this.parent) return;

    const speedScale = 1 + this.parent.stage * 0.25;
    this.angleOffset += orbCfg.speed * speedScale;

    if (this.state === "appearing") {
      this.updateOrbit();
      if (this.appearTimer.elapsed()) {
        this.state = "orbiting";
        this.setCollision(true, false);
      }
    } else if (this.state === "orbiting") {
      this.updateOrbit();
      if (this.diveTimer.elapsed()) {
        this.state = "warning";
        this.warningTimer.set(orbCfg.warningTime);
      }
    } else if (this.state === "warning") {
      this.updateOrbit(); // still orbit while warning
      if (this.warningTimer.elapsed()) {
        this.state = "diving";
        // Lock world position for dive
        this.diveX = this.pos.x;
      }
    } else if (this.state === "diving") {
      this.updateDive();
    } else if (this.state === "returning") {
      this.updateReturn();
    }

    super.update();

    if (this.state !== "returning") {
      // The engine skips collision for child objects (o.parent check in the collision loop).
      engineObjectsCallback(this.pos, this.size, (o) => {
        if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
          this.collideWithObject(o);
          o.collideWithObject(this);
        }
      });
    }
  }

  updateOrbit() {
    this.localAngle = this.angleOffset;
    this.localPos = vec2(
      Math.cos(this.angleOffset),
      Math.sin(this.angleOffset),
    ).scale(orbCfg.radius);

    if (this.state === "appearing") {
      // Blink 10Hz
      const isVisible = ((time * 10) | 0) % 2;
      this.color.a = isVisible ? orbCfg.color.a : 0;
    } else if (this.state === "warning") {
      // Reuse missile blinking logic: 10Hz red blink
      const isRedPhase = ((time * 20) | 0) % 2;
      if (isRedPhase) this.color.set(1, 0, 0);
      else this.color.set(orbCfg.color.r, orbCfg.color.g, orbCfg.color.b);
    } else {
      this.color.set(
        orbCfg.color.r,
        orbCfg.color.g,
        orbCfg.color.b,
        orbCfg.color.a,
      );
    }
  }

  updateDive() {
    this.color = rgb(1, 0, 0);
    // Relative downward movement
    // To make it feel independent of boss horizontal movement, we'd need to adjust localPos
    // based on boss movement. A simpler way: dive fast enough that it doesn't matter,
    // or just calculate world pos.
    // Since it's a child, worldPos = parent.pos + localPos.rotate(parent.angle)
    // We want worldX to stay diveX, and worldY to decrease.

    const worldY = this.pos.y - orbCfg.diveSpeed;

    // Convert back to local space: localPos = (worldPos - parent.pos).rotate(-parent.angle)
    const worldPos = vec2(this.diveX, worldY);
    this.localPos = worldPos
      .subtract(this.parent.pos)
      .rotate(-this.parent.angle);

    // If far below player or off screen, transition to returning state
    if (this.pos.y < -5) {
      this.state = "returning";
    }
  }

  updateReturn() {
    // Calculate the target position in local space
    const targetLocalPos = vec2(
      Math.cos(this.angleOffset),
      Math.sin(this.angleOffset),
    ).scale(orbCfg.radius);

    const toTarget = targetLocalPos.subtract(this.localPos);
    const speed = orbCfg.diveSpeed * 0.8; // fly back up slightly slower

    if (toTarget.length() <= speed) {
      // Arrived back at orbit slot
      this.localPos = targetLocalPos;
      this.state = "orbiting";
      const actualDiveRate = orbCfg.diveRate || 600;
      this.diveTimer.set(rand(actualDiveRate * 0.8, actualDiveRate * 1.2) / 60);
      this.color.set(
        orbCfg.color.r,
        orbCfg.color.g,
        orbCfg.color.b,
        orbCfg.color.a,
      );
    } else {
      // Move towards the slot in local space
      this.localPos = this.localPos.add(toTarget.normalize().scale(speed));

      // Render semi-transparent while retreating to avoid confusing the player
      this.color.set(0.7, 0.7, 0.7, 0.4);
    }
  }

  collideWithObject(other) {
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      if (result === "destroy") other.destroy();
      this.applyHitEffect({ flashColor: new Color(1, 1, 1), duration: 0.05 });
      if (this.hp <= 0) this.destroy();
      return false;
    }
    return false;
  }

  render() {
    const shield = this.parent?.shield;
    const isAttached = this.state !== "diving" && this.state !== "returning";

    if (shield && !shield.destroyed && isAttached) {
      // Draw tether line from orbiter to shield border
      const toBoss = this.parent.pos.subtract(this.pos);
      const dist = toBoss.length();
      const shieldRadius = (shield.size.x / 2) * shieldCfg.hitboxScale;

      if (dist > shieldRadius) {
        this.tetherColor.set(
          this.color.r,
          this.color.g,
          this.color.b,
          this.color.a * 0.5,
        );
        // The line starts at the orbiter and ends at the shield's edge
        const endPos = this.pos.add(
          toBoss.normalize().scale(dist - shieldRadius),
        );
        drawLine(this.pos, endPos, 0.05, this.tetherColor);
      }
    }
    super.render();
  }

  destroy() {
    if (this.destroyed) return;

    // Cosmetic explosion effect
    gameEffects.explode(this.pos);

    // Secondary smoke burst
    new ParticleEmitter(
      this.pos,
      0,
      0.3,
      0.1,
      50,
      PI * 2,
      sprites.get("smoke_04.png", system.particleSheetName),
      rgb(0.8, 0.8, 0.8, 0.5),
      rgb(0.4, 0.4, 0.4, 0.3),
      rgb(0, 0, 0, 0),
      rgb(0, 0, 0, 0),
      0.8,
      1.0,
      2.5,
      0.02,
      0.01,
      0.95,
      1,
      -0.01, // slight upward drift
      PI * 2,
      0.05,
      0.2,
      false,
      false,
    );

    super.destroy();
  }
}

/**
 * Homing missile fired by the boss — destroyable by player bullets
 */
export class BossMissile extends BaseEntity {
  /**
   * @param {Vector2} pos
   * @param {Vector2} initialVel
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
    this.velocity = initialVel;
    this.setCollision(true, false);
    this.mass = 0;
    this.isEnemy = true; // so player bullets recognise it
    this.renderOrder = 8;
    this.lifeTimer = new Timer(lifetime ?? missileCfg.lifetime);
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
      if (result === "destroy") other.destroy();
      this.applyHitEffect({ flashColor: new Color(1, 1, 1), duration: 0.05 });
      if (this.hp <= 0) {
        new MissileExplosion(this.pos.copy(), 3);
        this.destroy();
      }
      return false;
    }
    // Collided with player ship
    if (other === player) {
      new MissileExplosion(this.pos.copy(), 3);
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

    // Burst of explosion particles - scaled by diameter
    new ParticleEmitter(
      this.pos,
      0, // angle
      diameter, // emitSize (radius-ish spread)
      0.2, // emitTime
      diameter * 50, // emitRate scaled by area/size
      PI * 2, // emitConeAngle
      sprites.get("scorch_03.png", system.particleSheetName),
      rgb(1, 0.5, 0.2), // colorStartA
      rgb(1, 1, 0.5), // colorStartB
      rgb(0.2, 0.2, 0.2, 0), // colorEndA
      rgb(0.1, 0.1, 0.1, 0), // colorEndB
      0.5, // particleTime
      diameter * 0.2, // sizeStart
      diameter * 0.05, // sizeEnd
      0.1, // speed
      0.05, // angleSpeed
      0.9, // damping
      0.9, // angleDamping
      0, // gravityScale
      PI * 2, // particleConeAngle
      0.1, // fadeRate
      0.5, // randomness
      false, // collideTiles
      true, // additive
    );
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

/**
 * Rotating beam hazard.
 * A rectangle centered at the boss's position, with a length equal to the beamLength.
 * The beam rotates around the boss's position at beamRotationSpeed.
 * The beam should not hurt the player until the startTimer has elapsed.
 * The beam is destroyed when the lifeTimer has elapsed.
 */
export class BossBeam extends EngineObject {
  constructor() {
    super(vec2(), vec2(beamCfg.length, beamCfg.width));
    this.setCollision(false, false);
    this.mass = 0;
    this.isEnemy = true;
    this.noDestroyOnImpact = true;
    this.renderOrder = -1;

    this.state = "starting";
    this.startTimer = new Timer(0.5); // 0.5s charge telegraph
    this.lifeTimer = new Timer(); // will be set when active
    this.endTimer = new Timer(); // will be set when ending
    this.soundTimer = 0; // retriggers soundBossBeam while active
  }

  update() {
    if (!this.parent) return;

    this.updateState();
    this.updateRotation();
    this.updateColor();
    this.updateSize();
    this.updateSound();
    super.update();

    if (
      (this.state === "active" || this.state === "ending") &&
      !this.destroyed
    ) {
      // Manual collision check since child objects skip engine-level collision
      // We use a custom oriented check because LittleJS 1.x is AABB only
      engineObjectsCallback(this.pos, vec2(this.size.x), (o) => {
        if (o === player && !o.destroyed) {
          // Rotate the distance vector into the beam's local space to check bounds
          const diff = o.pos.subtract(this.pos);
          const rotatedDiff = diff.rotate(-this.angle);

          const halfSizeX = this.size.x / 2;
          const halfSizeY = this.size.y / 2;
          const playerBufferX = o.size.x / 2;
          const playerBufferY = o.size.y / 2;

          if (
            Math.abs(rotatedDiff.x) < halfSizeX + playerBufferX &&
            Math.abs(rotatedDiff.y) < halfSizeY + playerBufferY
          ) {
            this.collideWithObject(o);
            o.collideWithObject(this);
          }
        }
      });
    }
  }

  updateState() {
    if (this.state === "starting" && this.startTimer.elapsed()) {
      this.state = "active";
      this.lifeTimer.set(beamCfg.duration / 60);
    } else if (this.state === "active" && this.lifeTimer.elapsed()) {
      this.state = "ending";
      this.endTimer.set(beamCfg.endDuration / 60);
    } else if (this.state === "ending" && this.endTimer.elapsed()) {
      this.destroy();
    }
  }

  updateRotation() {
    this.localAngle += beamCfg.rotationSpeed;
  }

  updateColor() {
    const color =
      this.state !== "starting"
        ? rgb(1, 0, 0, 0.7) // Active / Ending
        : rgb(1, 1, 1, 0.3); // Starting (Telegraphing)
    this.color = color;
  }

  updateSound() {
    if (this.state !== "active") {
      this.soundTimer = 0;
      return;
    }
    if (this.soundTimer <= 0) {
      soundBossBeam.play();
      this.soundTimer = 16; // ≈ sound envelope length in frames
    } else {
      this.soundTimer--;
    }
  }

  updateSize() {
    let targetScale = 0;

    if (this.state === "starting") {
      targetScale = this.startTimer.getPercent();
    } else if (this.state === "active") {
      targetScale = 1;
    } else if (this.state === "ending") {
      targetScale = 1 - this.endTimer.getPercent();
    }

    // Apply smoothstep easing to make the animation feel more premium
    const p = targetScale * targetScale * (3 - 2 * targetScale);

    this.size.x = lerp(0, beamCfg.length, p);
    this.size.y = lerp(0, beamCfg.width, p);
  }
}

/**
 * Invulnerable shield visual and hitbox.
 * Absorbs player bullets and pushes the player ship away.
 */
export class BossShield extends EngineObject {
  constructor() {
    const tileInfo = sprites.get(shieldCfg.sprite, system.particleSheetName);
    super(
      vec2(),
      vec2((bossCfg.size.x / 2 + shieldCfg.radiusOffset) * 2),
      tileInfo,
    );

    this.renderOrder = shieldCfg.renderOrder; // Render above boss, below orbiters
    this.baseColor = shieldCfg.baseColor.copy();
    this.color = this.baseColor.copy();
    this.hitColor = shieldCfg.hitColor.copy();

    // Disable standard collision to handle bullets and player manually
    this.setCollision(false, false);
    this.mass = 0;
  }

  update() {
    super.update();
    if (!this.parent) return;

    // Visual pulse
    const scale =
      1 + Math.sin(time * shieldCfg.pulseSpeed) * shieldCfg.pulseMagnitude;
    this.size = vec2((bossCfg.size.x / 2 + shieldCfg.radiusOffset) * 2).scale(
      scale,
    );
    const radius = (this.size.x / 2) * shieldCfg.hitboxScale;

    // Collision sweep
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (o.isBullet && !o.isEnemy) {
        if (o.pos.distanceSquared(this.pos) < radius * radius) {
          o.destroy();
          // Hit flash
          this.color.set(
            this.hitColor.r,
            this.hitColor.g,
            this.hitColor.b,
            this.hitColor.a,
          );
        }
      } else if (o === player && !o.destroyed) {
        const diff = o.pos.subtract(this.pos);
        const dist = diff.length();
        const combinedRadius =
          radius + o.size.x * shieldCfg.playerHitRadiusScale;

        if (dist > 0 && dist < combinedRadius) {
          const normal = diff.normalize();
          // Snap player outside
          o.pos = this.pos.add(normal.scale(combinedRadius));
          // Apply outward velocity bounce
          o.velocity = o.velocity.add(normal.scale(shieldCfg.bounceSpeed));
        }
      }
    });

    // Fade color back
    this.color.lerp(this.baseColor, shieldCfg.colorFadeSpeed);
  }
}
