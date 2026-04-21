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
    this.setCollision(true);
    this.renderOrder = 5;
  }

  update() {
    if (!this.parent) return;
    const healthPercent = this.parent.hp / this.parent.maxHp;
    const stage = Math.min(4, Math.floor((1 - healthPercent) * 5));
    const speedScale = 1 + stage * 0.25; // Gradual: 1.0, 1.25, 1.5, 1.75, 2.0

    this.angleOffset += orbCfg.speed * speedScale;
    this.localAngle = this.angleOffset;
    this.localPos = vec2(
      Math.cos(this.angleOffset),
      Math.sin(this.angleOffset),
    ).scale(orbCfg.radius);
    super.update();

    // The engine skips collision for child objects (o.parent check in the collision loop).
    // We manually check nearby objects and call both sides, matching engine behavior.
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
        this.collideWithObject(o);
        o.collideWithObject(this); // triggers bullet's impact particle effect
      }
    });
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
 * Invisible explosion zone spawned when a missile's lifetime expires.
 * Lasts one frame, radius 5 world tiles — damages the player on contact.
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
 * Boss with dynamic movement, fire emitters, and pulse attacks
 */
export class Boss extends BaseEntity {
  /**
   * @param {import('../../node_modules/littlejsengine/dist/littlejs.esm.js').Vector2} entryPos - In-level destination
   */
  constructor(entryPos) {
    // Spawn well above the visible playfield
    const spawnPos = vec2(entryPos.x, entryPos.y + 14);
    super(
      spawnPos,
      bossCfg.sprite,
      bossCfg.sheet,
      bossCfg.hitboxScale,
      bossCfg.size,
      bossCfg.mirrorX,
      bossCfg.mirrorY,
    );

    this.hp = bossCfg.hp;
    this.maxHp = bossCfg.hp;
    this.color = bossCfg.color.copy();
    this.setCollision(true);
    this.mass = 1;

    // Approach the entry position before starting normal movement
    this.isEntering = true;
    this.targetPos = entryPos.copy();
    this.moveTimer = 0;
    this.pulseTimer = 0;
    this.volleyCount = 0; // tracks nova pulses; missiles fire every missileCfg.volleys pulses

    this.fireEmitters = [];
    this.orbiters = [];
    this.initFireEmitters();
    this.initOrbiters();
  }

  initFireEmitters() {
    for (const offset of bossCfg.fireLocations) {
      const emitter = new ParticleEmitter(
        this.pos,
        0, // angle
        0.2, // emitSize
        0, // emitTime (loop)
        0, // emitRate (starts off, driven by updateVisuals)
        PI, // emitConeAngle
        sprites.get("fire_02.png", system.particleSheetName),
        rgb(1, 0.5, 0), // colorStartA
        rgb(1, 0.2, 0), // colorStartB
        rgb(1, 0.5, 0, 0), // colorEndA
        rgb(1, 0.2, 0, 0), // colorEndB
        0.5, // particleTime
        2, // sizeStart
        0.5, // sizeEnd
        0.05, // speed
        0.05, // angleSpeed
        0.95, // damping
        1, // angleDamping
        1, // gravityScale
        PI, // particleConeAngle
        0.1, // fadeRate
        0.2, // randomness
        false, // collideTiles
        true, // additive
        false, // randomColorLinear
        0, // renderOrder
        true, // localSpace
      );
      this.addChild(emitter, offset);
      this.fireEmitters.push(emitter);
    }
  }

  initOrbiters() {
    for (const angle of [0, PI, PI / 2, (3 * PI) / 2]) {
      const orbiter = new BossOrbiter(angle);
      this.addChild(orbiter);
      this.orbiters.push(orbiter);
    }
  }

  update() {
    this.updateMovement();
    this.updateAttacks();
    this.updateVisuals();
    super.update();
  }

  updateMovement() {
    const healthPercent = this.hp / this.maxHp;
    const stage = Math.min(4, Math.floor((1 - healthPercent) * 5));
    const moveScale = 1 + stage * 0.125; // Gradual: 1.0, 1.125, 1.25, 1.375, 1.5

    if (this.isEntering) {
      // Glide toward the entry position; clear flag once arrived
      const toEntry = this.targetPos.subtract(this.pos);
      if (toEntry.length() < 0.5) {
        this.isEntering = false;
        this.moveTimer = 0; // trigger an immediate first random move
      } else {
        this.velocity = this.velocity.add(
          toEntry.normalize().scale(bossCfg.speed * 0.1),
        );
        this.velocity = this.velocity.scale(0.95);
      }
      return;
    }

    this.moveTimer -= moveScale;

    const margin = orbCfg.radius + 1.5;
    if (this.moveTimer <= 0) {
      this.targetPos = vec2(
        rand(margin, system.levelSize.x - margin),
        rand(system.levelSize.y - margin - 3, system.levelSize.y - margin),
      );
      this.moveTimer = rand(120, 300);
    }

    const toTarget = this.targetPos.subtract(this.pos);
    if (toTarget.length() > 0.1) {
      this.velocity = this.velocity.add(
        toTarget.normalize().scale(bossCfg.speed * 0.1 * moveScale),
      );
    }
    this.velocity = this.velocity.scale(0.95);
  }

  updateAttacks() {
    const healthPercent = this.hp / this.maxHp;
    const stage = Math.min(4, Math.floor((1 - healthPercent) * 5));
    const rateScale = 1 + stage * 0.25; // Gradual: 1.0, 1.25, 1.5, 1.75, 2.0
    this.pulseTimer += rateScale;
    if (this.pulseTimer >= bossCfg.pulseRate) {
      this.pulseTimer = 0;
      this.novaPulse();
    }
  }

  novaPulse() {
    this.volleyCount++;
    this.fireNovaSalve(0);
    setTimeout(() => {
      if (!this.destroyed) this.fireNovaSalve(0.5 / 24);
    }, 200);

    if (this.volleyCount >= missileCfg.volleys) {
      this.volleyCount = 0;
      setTimeout(() => {
        if (!this.destroyed) this.fireMissiles();
      }, 1000); // 1 second delay after 3rd volley
    }
  }

  fireMissiles() {
    const healthPercent = this.hp / this.maxHp;
    const stage = Math.min(4, Math.floor((1 - healthPercent) * 5));
    const missileLifetime = missileCfg.lifetime - stage * 1.0;

    // Offsets relative to boss centre (world units)
    // Front = top of ship (positive Y), Back = bottom (negative Y)
    const spawnOffsets = [
      vec2(-1.2, 2.5), // front-left
      vec2(1.2, 2.5), // front-right
      vec2(-1.2, -2.5), // back-left
      vec2(1.2, -2.5), // back-right
    ];
    const kickSpeed = 0.6;
    for (const offset of spawnOffsets) {
      const spawnPos = this.pos.add(offset);
      // Back missiles (negative Y offset) kick upward so they initially face
      // the top of the screen before homing curves them toward the player.
      // Front missiles kick outward-and-up as before.
      const kick =
        offset.y < 0
          ? vec2(Math.sign(offset.x) * kickSpeed * 0.3, kickSpeed) // up + slight lateral
          : offset.normalize().scale(kickSpeed);
      new BossMissile(spawnPos, kick, missileLifetime);
    }
  }

  fireNovaSalve(offsetFactor) {
    const pulseCount = 24;
    const offset = offsetFactor * PI * 2;
    for (let i = 0; i < pulseCount; i++) {
      const angle = (i / pulseCount) * PI * 2 + offset;
      const bulletVel = vec2(Math.cos(angle), Math.sin(angle)).scale(0.2);
      const b = new Bullet(this.pos.copy(), bulletVel, "boss");
      b.color = rgb(1, 0.2, 0.2);
    }
  }

  updateVisuals() {
    // Progressively activate fire emitters as hp drops
    const step = this.maxHp / 5;
    for (let i = 0; i < this.fireEmitters.length; i++) {
      const emitter = this.fireEmitters[i];
      if (this.hp < step) emitter.emitRate = 100;
      else if (this.hp < step * 2) emitter.emitRate = i < 3 ? 80 : 0;
      else if (this.hp < step * 3) emitter.emitRate = i < 2 ? 60 : 0;
      else if (this.hp < step * 4) emitter.emitRate = i < 1 ? 40 : 0;
      else emitter.emitRate = 0;
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.applyHitEffect({ flashColor: new Color(1, 1, 1), duration: 0.05 });
      if (this.hp <= 0) this.destroy(); // cascades to all child emitters
      return false;
    }
    return false;
  }
}
