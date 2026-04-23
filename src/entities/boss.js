import { vec2, ParticleEmitter, Color, rgb, rand, PI } from "../engine.js";
import {
  system,
  boss as bossCfg,
  orbiter as orbCfg,
  missile as missileCfg,
  beam as beamCfg,
} from "../config.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { soundExplosion1 } from "../sounds.js";
import * as gameEffects from "../gameEffects.js";

import {
  BossOrbiter,
  BossMissile,
  BossBeam,
  BossShield,
} from "./bossChildren.js";
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
    this.isEnemy = true;
    this.noDestroyOnImpact = true;

    // Approach the entry position before starting normal movement
    this.state = "entering";
    this.targetPos = entryPos.copy();
    this.moveTimer = 0;
    this.pulseTimer = 0;
    this.vulnerableAttackTimer = 200; // start partially charged
    this.nextAttackIsBeam = false;
    this.thresholds = [0.66, 0.33];

    this.fireEmitters = [];
    this.orbiters = [];
    this.initFireEmitters();
    this.workingVec = vec2();
    this.workingVec2 = vec2();
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

  get stage() {
    const healthPercent = this.hp / this.maxHp;
    return Math.min(4, Math.floor((1 - healthPercent) * 5));
  }

  update() {
    this.updateMovement();
    if (this.state === "active") {
      this.updateAttacks();
    }
    this.updateVisuals();
    super.update();
  }

  updateMovement() {
    if (this.state === "entering") {
      // Glide toward the entry position; switch to active once arrived
      const toEntry = this.targetPos.subtract(this.pos);
      if (toEntry.length() < 0.5) {
        this.state = "active";
        this.initOrbiters();
        this.moveTimer = 0; // trigger an immediate first random move
      } else {
        const accel = toEntry.normalize(bossCfg.speed * 0.1);
        this.velocity = this.velocity.add(accel);
        this.velocity = this.velocity.scale(0.95);
      }
      return;
    }

    const moveScale = 1 + this.stage * 0.125; // Gradual: 1.0, 1.125, 1.25, 1.375, 1.5

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
      const accel = toTarget.normalize(bossCfg.speed * 0.1 * moveScale);
      this.velocity = this.velocity.add(accel);
    }
    this.velocity = this.velocity.scale(0.95);
  }

  updateAttacks() {
    const rateScale = 1 + this.stage * 0.25; // Gradual: 1.0, 1.25, 1.5, 1.75, 2.0
    const activeOrbiters = this.orbiters.filter((o) => !o.destroyed);

    if (activeOrbiters.length > 0) {
      // Spawn shield if it isn't active
      if (!this.shield || this.shield.destroyed) {
        this.shield = new BossShield();
        this.addChild(this.shield);
      }
      // Shield is UP: Only fire nova pulses
      this.updateNovaPulse(rateScale);
    } else {
      // Destroy shield if it is still active
      if (this.shield && !this.shield.destroyed) {
        this.shield.destroy();
      }
      // Shield is DOWN: Alternate between beams and missiles
      this.updateVulnerableAttacks(rateScale);
    }

    this.checkThresholds();
  }

  updateNovaPulse(rateScale) {
    this.pulseTimer += rateScale;
    if (this.pulseTimer >= bossCfg.novaRate) {
      this.pulseTimer = 0;
      this.novaPulse();
    }
  }

  updateVulnerableAttacks(rateScale) {
    this.vulnerableAttackTimer += rateScale;
    // Base the alternation rate roughly on the configured beam rate or similar timing (600 = 10s, which is slow for alternation. Let's use 300)
    if (this.vulnerableAttackTimer >= 300) {
      this.vulnerableAttackTimer = 0;
      this.nextAttackIsBeam = !this.nextAttackIsBeam;

      if (this.nextAttackIsBeam) {
        this.fireBeams();
      } else {
        this.fireMissiles();
      }
    }
  }

  fireBeams() {
    const startAngle = rand(0, PI * 2);
    for (let i = 0; i < beamCfg.count; i++) {
      const initialAngle = (i / beamCfg.count) * PI * 2 + startAngle;
      const beam = new BossBeam();
      this.addChild(beam, vec2(0, 0), initialAngle);
    }
  }

  checkThresholds() {
    if (this.thresholds.length > 0) {
      const healthPercent = this.hp / this.maxHp;
      if (healthPercent <= this.thresholds[0]) {
        this.thresholds.shift();
        this.respawnOrbiters();
      }
    }
  }

  respawnOrbiters() {
    // Destroy existing orbiters and re-init for a clean "shield phase"
    this.orbiters.forEach((o) => o.destroy());
    this.orbiters = [];
    this.initOrbiters();

    // Visual feedback for shield recharge
    this.applyEffect(new gameEffects.FlashEffect(new Color(0.2, 0.5, 1), 0.5));
  }

  novaPulse() {
    this.fireNovaSalve(0);
    setTimeout(() => {
      if (!this.destroyed) this.fireNovaSalve(0.5 / 24);
    }, 200);
  }

  fireMissiles() {
    const missileLifetime = missileCfg.lifetime - this.stage * 1.0;

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
          : offset.normalize(kickSpeed);
      new BossMissile(spawnPos, kick, missileLifetime);
    }
  }

  fireNovaSalve(offsetFactor) {
    const pulseCount = 24;
    const offset = offsetFactor * PI * 2;
    for (let i = 0; i < pulseCount; i++) {
      const angle = (i / pulseCount) * PI * 2 + offset;
      const bulletVel = vec2(Math.cos(angle), Math.sin(angle)).scale(0.2);
      new Bullet(this.pos.copy(), bulletVel, "boss").color = rgb(1, 0.2, 0.2);
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
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const activeOrbiters = this.orbiters.filter((o) => !o.destroyed);
      if (activeOrbiters.length > 0) {
        this.applyEffect(
          new gameEffects.FlashEffect(new Color(0.2, 0.5, 1), 0.1),
        );
        other.destroy();
        return false;
      }

      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      if (result === "destroy") other.destroy();
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 0, 0), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.05, 0.1));
      if (this.hp <= 0) {
        soundExplosion1.play();
        this.destroy();
      }
      return false;
    }
    return false;
  }
}
