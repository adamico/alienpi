import {
  vec2,
  Color,
  rgb,
  rand,
  engineObjectsCallback,
  Timer,
  EngineObject,
  ParticleEmitter,
  drawCircle,
  drawRect,
  drawLine,
  time,
  lerp,
  PI,
} from "../engine.js";
import * as gameEffects from "../gameEffects.js";

import {
  system,
  boss as bossCfg,
  beam as beamCfg,
  orbiter as orbCfg,
  orbiterLooter as orbLootCfg,
  missile as missileCfg,
  shield as shieldCfg,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { player } from "./player.js";
import { soundBossBeam } from "../sounds.js";

import { Loot } from "./loot.js";
import { player as playerCfg } from "../config.js";
import { addScore, SCORE } from "../score.js";

/**
 * Defensive pods that orbit the boss
 */
export class BossOrbiter extends BaseEntity {
  constructor(initialAngle, hp, hasLoot = false, pos = vec2()) {
    const cfg = hasLoot ? orbLootCfg : orbCfg;
    super(
      pos,
      cfg.sprite,
      cfg.sheet,
      cfg.hitboxScale,
      cfg.size,
      cfg.mirrorX,
      cfg.mirrorY,
    );
    this.cfg = cfg;
    this.angleOffset = initialAngle;
    this.hp = hp ?? cfg.baseHp;
    this.hasLoot = hasLoot;
    this.color = cfg.color.copy();
    this.mass = 0;
    this.isSolid = false;
    this.setCollision(false, false); // No collision while appearing
    this.renderOrder = -1; // Render below the boss
    this.state = "appearing";
    this.appearTimer = new Timer(cfg.appearTime);
    this.diveTimer = new Timer(
      rand(cfg.diveRate * 0.5, cfg.diveRate * 1.5) / 60,
    );
    this.warningTimer = new Timer();
    this.tetherColor = this.color.copy();
    this.isEnemy = true;
    this.spawnPos = this.pos.copy();

    if (this.hasLoot) {
      // Golden outline to signify valuable cargo
      this.applyEffect(new gameEffects.OutlineEffect(rgb(1, 0.8, 0), 0.08));
      // Subtle golden pulse
      this.applyEffect(new gameEffects.PulseEffect(rgb(1, 0.9, 0.2, 0.3), 3.0));
      this.initLootSparkles();
    }
  }

  initLootSparkles() {
    const sparkles = new ParticleEmitter(
      this.pos,
      0, // angle
      this.size.x * 0.5, // emitSize
      0, // emitTime (loop)
      15, // emitRate
      PI * 2, // emitConeAngle
      sprites.get("spark_01.png", system.particleSheetName),
      rgb(1, 1, 0.5), // colorStartA
      rgb(1, 0.8, 0.2), // colorStartB
      rgb(1, 0.5, 0, 0), // colorEndA
      rgb(1, 0.2, 0, 0), // colorEndB
      0.6, // particleTime
      0.1, // sizeStart
      0.02, // sizeEnd
      0.02, // speed
      0.05, // angleSpeed
      0.95, // damping
      1, // angleDamping
      -0.01, // gravityScale (slight float up)
      PI * 2, // particleConeAngle
      0.1, // fadeRate
      0.5, // randomness
      false, // collideTiles
      true, // additive
      true, // randomColorLinear
      10, // renderOrder
      true, // localSpace
    );
    this.addChild(sparkles);
  }

  destroy() {
    if (this.destroyed) return;

    if (this.hasLoot) {
      const lootKeys =
        playerCfg.weaponSystem.mode === "ACTIVE"
          ? ["star"]
          : ["blue", "green", "red", "star"];
      const key = lootKeys[Math.floor(rand(lootKeys.length))];
      new Loot(this.pos.copy(), key);
    }

    super.destroy();
  }

  update() {
    // Handle state transitions
    if (this.state === "appearing") {
      if (this.appearTimer.elapsed()) {
        this.state = "orbiting";
        this.setCollision(true, false);
      }
    }

    // AI/Movement logic
    if (this.state === "appearing") {
      this.updateOrbit();
    } else if (this.state === "orbiting") {
      this.updateOrbit();
      if (this.diveTimer.elapsed()) {
        this.state = "warning";
        this.warningTimer.set(this.cfg.warningTime);
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

    if (this.parent) {
      const speedScale = 1 + this.parent.stage * 0.25;
      this.angleOffset += this.cfg.speed * speedScale;
    }

    super.update();

    // Collision check - required because LittleJS ignores children in its main loop
    if (this.state !== "returning") {
      engineObjectsCallback(this.pos, this.size, (o) => {
        if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
          this.collideWithObject(o);
          o.collideWithObject(this);
        }
      });
    }
  }

  updateOrbit() {
    if (this.parent) {
      this.localAngle = this.angleOffset;
      this.localPos = vec2(
        Math.cos(this.angleOffset),
        Math.sin(this.angleOffset),
      ).scale(this.cfg.radius);
    } else {
      this.pos = this.spawnPos.copy();
    }

    if (this.state === "appearing") {
      // Blink 10Hz
      const isVisible = ((time * 10) | 0) % 2;
      this.color.a = isVisible ? this.cfg.color.a : 0;
    } else if (this.state === "warning") {
      // Reuse missile blinking logic: 10Hz red blink
      const isRedPhase = ((time * 20) | 0) % 2;
      if (isRedPhase) this.color.set(1, 0, 0);
      else this.color.set(this.cfg.color.r, this.cfg.color.g, this.cfg.color.b);
    } else {
      this.color.set(
        this.cfg.color.r,
        this.cfg.color.g,
        this.cfg.color.b,
        this.cfg.color.a,
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

    const worldY = this.pos.y - this.cfg.diveSpeed;
    const worldPos = vec2(this.diveX, worldY);

    if (this.parent) {
      this.localPos = worldPos
        .subtract(this.parent.pos)
        .rotate(-this.parent.angle);
    } else {
      this.pos = worldPos;
    }

    // If far below player or off screen, transition to returning state
    if (this.pos.y < -5) {
      this.state = "returning";
    }
  }

  updateReturn() {
    // Calculate the target position
    let toTarget;
    const speed = this.cfg.diveSpeed * 0.8; // fly back up slightly slower

    if (this.parent) {
      const targetLocalPos = vec2(
        Math.cos(this.angleOffset),
        Math.sin(this.angleOffset),
      ).scale(this.cfg.radius);
      toTarget = targetLocalPos.subtract(this.localPos);

      if (toTarget.length() <= speed) {
        this.localPos = targetLocalPos;
        this.state = "orbiting";
        this.resetDiveTimer();
      } else {
        this.localPos = this.localPos.add(toTarget.normalize().scale(speed));
      }
    } else {
      toTarget = this.spawnPos.subtract(this.pos);

      if (toTarget.length() <= speed) {
        this.pos = this.spawnPos.copy();
        this.state = "orbiting";
        this.resetDiveTimer();
      } else {
        this.pos = this.pos.add(toTarget.normalize().scale(speed));
      }
    }

    if (this.state === "orbiting") {
      this.color.set(
        this.cfg.color.r,
        this.cfg.color.g,
        this.cfg.color.b,
        this.cfg.color.a,
      );
    } else {
      // Render semi-transparent while retreating
      this.color.set(0.7, 0.7, 0.7, 0.4);
    }
  }

  resetDiveTimer() {
    const actualDiveRate = this.cfg.diveRate || 600;
    this.diveTimer.set(rand(actualDiveRate * 0.8, actualDiveRate * 1.2) / 60);
  }

  collideWithObject(other) {
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 0), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.2, 0.1));
      if (this.hp <= 0) {
        addScore(this.hasLoot ? SCORE.orbiterLoot : SCORE.orbiter);
        this.destroy();
      }
      return false;
    }
    return false;
  }

  render() {
    if (this.parent && !this.parent.destroyed) {
      // Tether from orbiter to boss center; renderOrder=-1 keeps it behind the boss sprite.
      this.tetherColor.set(
        this.color.r,
        this.color.g,
        this.color.b,
        this.color.a * 0.5,
      );
      drawLine(this.pos, this.parent.pos, 0.05, this.tetherColor);
    }
    super.render();
  }
}

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
      soundBossBeam.play(vec2(), 0.2);
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

  render() {
    if (this.state === "starting") {
      super.render();
      return;
    }

    const color = this.color;
    const glowColor = color.copy();
    glowColor.a *= 0.3;
    // Scale core alpha based on the beam's current alpha (for fading)
    const coreColor = rgb(1, 1, 1, 0.8 * (color.a / 0.7));

    // Add slight rotation jitter for an "unstable energy" effect
    const jitter = rand(-0.01, 0.01);
    const renderAngle = this.angle + jitter;

    // 1. Subtle Glow (Close to hitbox to avoid confusion)
    drawRect(
      this.pos,
      vec2(this.size.x, this.size.y * 1.2),
      glowColor,
      renderAngle,
    );
    // 2. Main Beam (Matches hitbox)
    drawRect(this.pos, this.size, color, renderAngle);
    // 3. Hot Core (Thin and bright)
    drawRect(
      this.pos,
      vec2(this.size.x, this.size.y * 0.3),
      coreColor,
      renderAngle,
    );
  }
}

/**
 * Invulnerable shield visual and hitbox.
 * Absorbs player bullets and pushes the player ship away.
 */
export class BossShield extends EngineObject {
  constructor() {
    const tileInfo = sprites.get(shieldCfg.sprite, shieldCfg.sheet);
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
          o.destroy(true);
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
