import {
  vec2,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { system, boss as bossCfg, orbiter as orbCfg } from "../config.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";

/**
 * Defensive pods that orbit the boss
 */
export class BossOrbiter extends BaseEntity {
  constructor(boss, angle) {
    super(
      boss.pos.copy(),
      orbCfg.sprite,
      orbCfg.sheet,
      orbCfg.hitboxScale,
      orbCfg.size,
      orbCfg.mirrorX,
      orbCfg.mirrorY,
    );
    this.boss = boss;
    this.angleOffset = angle;
    this.hp = orbCfg.hp;
    this.color = orbCfg.color.copy();
    this.setCollision(true);
    this.renderOrder = 5;
  }

  update() {
    if (this.boss.destroyed) {
      this.destroy();
      return;
    }

    // Maintain orbit
    this.angleOffset += orbCfg.speed;
    this.angle = this.angleOffset;
    const orbitPos = vec2(
      Math.cos(this.angleOffset),
      Math.sin(this.angleOffset),
    ).scale(orbCfg.radius);
    this.pos = this.boss.pos.add(orbitPos);

    super.update();
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 1, 1);
      setTimeout(() => (this.color = orbCfg.color.copy()), 50);
      if (this.hp <= 0) this.destroy();
      return false;
    }
    return false;
  }
}

/**
 * Enhanced Boss with dynamic movement and pulse attacks
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
    this.mass = 1; // Needs mass > 0 to process collisions against mass=0 bullets

    // Movement
    this.targetPos = pos.copy();
    this.moveTimer = 0;

    // Attacks
    this.pulseTimer = 0;

    // Sub-entities
    this.fireEmitters = [];
    this.orbiters = [];
    this.initEmitters();
    this.initOrbiters();
  }

  initEmitters() {
    for (const offset of bossCfg.fireLocations) {
      const emitter = new ParticleEmitter(
        this.pos.add(offset),
        0,
        0.2,
        0,
        50,
        PI,
        undefined,
        rgb(1, 0.5, 0),
        rgb(1, 0.2, 0),
        rgb(1, 0.5, 0, 0),
        rgb(1, 0.2, 0, 0),
        0.5,
        0.2,
        0.5,
        0.05,
        0.05,
        0.95,
        1,
        1,
        PI,
        0.1,
        0.2,
        false,
        true,
      );
      emitter.emitRate = 0;
      this.fireEmitters.push({ offset, emitter });
    }
  }

  initOrbiters() {
    this.orbiters.push(new BossOrbiter(this, 0));
    this.orbiters.push(new BossOrbiter(this, PI));
    this.orbiters.push(new BossOrbiter(this, PI / 2));
    this.orbiters.push(new BossOrbiter(this, (3 * PI) / 2));
  }

  update() {
    this.updateMovement();
    this.updateAttacks();
    this.updateVisuals();
    super.update();
  }

  updateMovement() {
    // Wander logic
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

    // Smooth move toward target
    const toTarget = this.targetPos.subtract(this.pos);
    if (toTarget.length() > 0.1) {
      this.velocity = this.velocity.add(
        toTarget.normalize().scale(bossCfg.speed * 0.1 * moveScale),
      );
    }
    this.velocity = this.velocity.scale(0.95); // Damping
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
    }, 200); // 0.2 sec delay
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
    const step = this.maxHp / 5;
    for (const ef of this.fireEmitters) {
      ef.emitter.pos = this.pos.add(ef.offset);
      const idx = this.fireEmitters.indexOf(ef);

      if (this.hp < step) {
        ef.emitter.emitRate = 100;
      } else if (this.hp < step * 2) {
        ef.emitter.emitRate = idx < 3 ? 80 : 0;
      } else if (this.hp < step * 3) {
        ef.emitter.emitRate = idx < 2 ? 60 : 0;
      } else if (this.hp < step * 4) {
        ef.emitter.emitRate = idx < 1 ? 40 : 0;
      } else {
        ef.emitter.emitRate = 0;
      }
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 1, 1);
      setTimeout(() => (this.color = bossCfg.color.copy()), 50);

      if (this.hp <= 0) {
        this.destroy();
        for (const ef of this.fireEmitters) ef.emitter.destroy();
      }
      return false;
    }
    return false;
  }
}
