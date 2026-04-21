import {
  vec2,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
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

import { BossOrbiter, BossMissile, BossBeam } from "./bossChildren.js";
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
    this.beamTimer = 200; // start partially charged
    this.volleyCount = 0; // tracks nova pulses; missiles fire every missileCfg.volleys pulses
    this.thresholds = [0.66, 0.33];

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
    this.updateNovaPulse(rateScale);
    this.updateBeams(rateScale);
    this.checkThresholds();
  }

  updateNovaPulse(rateScale) {
    this.pulseTimer += rateScale;
    if (this.pulseTimer >= bossCfg.novaRate) {
      this.pulseTimer = 0;
      this.novaPulse();
    }
  }

  updateBeams(rateScale) {
    this.beamTimer += rateScale;
    if (this.beamTimer >= bossCfg.beamRate) {
      this.beamTimer = 0;
      const startAngle = rand(0, PI * 2);
      for (let i = 0; i < bossCfg.beamCount; i++) {
        const initialAngle = (i / bossCfg.beamCount) * PI * 2 + startAngle;
        const beam = new BossBeam();
        this.addChild(beam, vec2(0, 0), initialAngle);
      }
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
    this.applyHitEffect({ flashColor: new Color(0.2, 0.5, 1), duration: 0.5 });
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
      // Invincible if any orbiters are alive
      const activeOrbiters = this.orbiters.filter((o) => !o.destroyed);
      if (activeOrbiters.length > 0) {
        this.applyHitEffect({
          flashColor: new Color(0.2, 0.5, 1),
          duration: 0.1,
        });
        other.destroy();
        return false;
      }

      this.hp--;
      other.destroy();
      this.applyHitEffect({ flashColor: new Color(1, 1, 1), duration: 0.05 });
      if (this.hp <= 0) this.destroy(); // cascades to all child emitters
      return false;
    }
    return false;
  }
}
