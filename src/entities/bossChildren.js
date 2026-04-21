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
  time,
  lerp,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  system,
  boss as bossCfg,
  orbiter as orbCfg,
  missile as missileCfg,
} from "../config.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { player } from "./player.js";

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
    this.setCollision(true, false, false);
    this.renderOrder = 5;
    this.state = "orbiting";
    this.diveTimer = new Timer(
      rand(orbCfg.diveRate * 0.5, orbCfg.diveRate * 1.5),
    );
    this.warningTimer = new Timer();
  }

  update() {
    if (!this.parent) return;

    if (this.state === "orbiting") {
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
    }

    super.update();

    // The engine skips collision for child objects (o.parent check in the collision loop).
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
        this.collideWithObject(o);
        o.collideWithObject(this);
      }
    });
  }

  updateOrbit() {
    const healthPercent = this.parent.hp / this.parent.maxHp;
    const stage = Math.min(4, Math.floor((1 - healthPercent) * 5));
    const speedScale = 1 + stage * 0.25;

    this.angleOffset += orbCfg.speed * speedScale;
    this.localAngle = this.angleOffset;
    this.localPos = vec2(
      Math.cos(this.angleOffset),
      Math.sin(this.angleOffset),
    ).scale(orbCfg.radius);

    if (this.state === "warning") {
      // Reuse missile blinking logic: 10Hz red blink
      const isRedPhase = ((time * 20) | 0) % 2;
      this.color = isRedPhase ? rgb(1, 0, 0) : orbCfg.color.copy();
    } else {
      this.color = orbCfg.color.copy();
    }
  }

  updateDive() {
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

    // If far below player or off screen, return to orbit
    if (this.pos.y < -5) {
      this.state = "orbiting";
      this.diveTimer.set(rand(orbCfg.diveRate * 0.8, orbCfg.diveRate * 1.2));
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.applyHitEffect({ flashColor: new Color(1, 1, 1), duration: 0.05 });
      if (this.hp <= 0) this.destroy();
      return false;
    }
    return false;
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
    this.setCollision(true, false, false);
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
      this.color = isRedPhase ? rgb(1, 0, 0) : rgb(1, 1, 1);
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
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
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
    this.setCollision(true, false, false);
    this.mass = 0;
    this.isEnemy = true;
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
      this.setCollision(false, false, false);
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
    super(vec2(), vec2(bossCfg.beamLength, bossCfg.beamWidth));
    this.setCollision(false, false, false);
    this.mass = 0;
    this.isEnemy = true;
    this.noDestroyOnImpact = true;
    this.renderOrder = -1;

    this.state = "starting";
    this.startTimer = new Timer(0.5); // 0.5s charge telegraph
    this.lifeTimer = new Timer(); // will be set when active
    this.endTimer = new Timer(); // will be set when ending
  }

  update() {
    if (!this.parent) return;

    this.updateState();
    this.updateRotation();
    this.updateColor();
    this.updateSize();
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
      this.lifeTimer.set(bossCfg.beamDuration / 60);
    } else if (this.state === "active" && this.lifeTimer.elapsed()) {
      this.state = "ending";
      this.endTimer.set(bossCfg.beamEndDuration / 60);
    } else if (this.state === "ending" && this.endTimer.elapsed()) {
      this.destroy();
    }
  }

  updateRotation() {
    this.localAngle += bossCfg.beamRotationSpeed;
  }

  updateColor() {
    const color =
      this.state !== "starting"
        ? rgb(1, 0, 0, 0.7) // Active / Ending
        : rgb(1, 1, 1, 0.3); // Starting (Telegraphing)
    this.color = color;
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

    this.size.x = lerp(0, bossCfg.beamLength, p);
    this.size.y = lerp(0, bossCfg.beamWidth, p);
  }
}
