import {
  vec2,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
  engineObjectsCallback,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { system, boss as bossCfg, orbiter as orbCfg } from "../config.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";

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
    this.angleOffset += orbCfg.speed;
    this.localAngle = this.angleOffset;
    this.localPos = vec2(Math.cos(this.angleOffset), Math.sin(this.angleOffset)).scale(orbCfg.radius);
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
 * Boss with dynamic movement, fire emitters, and pulse attacks
 */
export class Boss extends BaseEntity {
  constructor(pos) {
    super(
      pos,
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

    this.targetPos = pos.copy();
    this.moveTimer = 0;
    this.pulseTimer = 0;

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
    const moveScale = this.hp < this.maxHp / 5 ? 1.5 : 1;
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
    const rateScale = this.hp < this.maxHp / 5 ? 2 : 1;
    this.pulseTimer += rateScale;
    if (this.pulseTimer >= bossCfg.pulseRate) {
      this.pulseTimer = 0;
      this.novaPulse();
    }
  }

  novaPulse() {
    this.fireNovaSalve(0);
    setTimeout(() => {
      if (!this.destroyed) this.fireNovaSalve(0.5 / 24);
    }, 200);
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
