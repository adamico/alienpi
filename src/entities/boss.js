import {
  vec2,
  EngineObject,
  drawTile,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { system, boss as bossCfg, orbiter as orbCfg } from "../config.js";
import { sprites } from "../sprites.js";
import { Bullet } from "./bullet.js";

/**
 * Defensive pods that orbit the boss
 */
export class BossOrbiter extends EngineObject {
  constructor(boss, angle) {
    const size = sprites.getSize(orbCfg.sprite, orbCfg.sheet, orbCfg.size);
    super(boss.pos.copy(), size);
    this.boss = boss;
    this.sprite = sprites.get(orbCfg.sprite, orbCfg.sheet);
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
    const orbitPos = vec2(Math.cos(this.angleOffset), Math.sin(this.angleOffset)).scale(orbCfg.radius);
    this.pos = this.boss.pos.add(orbitPos);
    
    super.update();
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, this.size, this.sprite, this.color, this.angleOffset);
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 1, 1);
      setTimeout(() => this.color = orbCfg.color.copy(), 50);
      if (this.hp <= 0) this.destroy();
      return false;
    }
    return false;
  }
}

/**
 * Enhanced Boss with dynamic movement and pulse attacks
 */
export class Boss extends EngineObject {
  constructor(pos) {
    const size = sprites.getSize(bossCfg.sprite, bossCfg.sheet, bossCfg.size);
    super(pos, size);
    
    this.sprite = sprites.get(bossCfg.sprite, bossCfg.sheet);
    this.hp = bossCfg.hp;
    this.maxHp = bossCfg.hp;
    this.color = bossCfg.color.copy();
    
    this.setCollision(true);
    this.mass = 0;
    
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
        this.pos.add(offset), 0, 0.2, 0, 50, PI,
        undefined,
        rgb(1, 0.5, 0), rgb(1, 0.2, 0),
        rgb(1, 0.5, 0, 0), rgb(1, 0.2, 0, 0),
        0.5, 0.2, 0.5, 0.05, 0.05,
        0.95, 1, 1, PI, 0.1,
        0.2, false, true
      );
      emitter.emitRate = 0;
      this.fireEmitters.push({ offset, emitter });
    }
  }

  initOrbiters() {
    this.orbiters.push(new BossOrbiter(this, 0));
    this.orbiters.push(new BossOrbiter(this, PI));
  }

  update() {
    this.updateMovement();
    this.updateAttacks();
    this.updateVisuals();
    super.update();
  }

  updateMovement() {
    // Wander logic
    this.moveTimer--;
    const margin = orbCfg.radius + 1.5;
    if (this.moveTimer <= 0) {
      this.targetPos = vec2(
        rand(margin, system.levelSize.x - margin),
        rand(system.levelSize.y - margin - 3, system.levelSize.y - margin)
      );
      this.moveTimer = rand(120, 300);
    }

    // Smooth move toward target
    const toTarget = this.targetPos.subtract(this.pos);
    if (toTarget.length() > 0.1) {
      this.velocity = this.velocity.add(toTarget.normalize().scale(bossCfg.speed * 0.1));
    }
    this.velocity = this.velocity.scale(0.95); // Damping
  }

  updateAttacks() {
    this.pulseTimer++;
    if (this.pulseTimer >= bossCfg.pulseRate) {
      this.pulseTimer = 0;
      this.novaPulse();
    }
  }

  novaPulse() {
    const pulseCount = 24;
    for (let i = 0; i < pulseCount; i++) {
      const angle = (i / pulseCount) * PI * 2;
      const bulletVel = vec2(Math.cos(angle), Math.sin(angle)).scale(0.2);
      const b = new Bullet(this.pos.copy(), bulletVel, 'boss');
      b.color = rgb(1, 0.2, 0.2);
    }
  }

  updateVisuals() {
    for (const ef of this.fireEmitters) {
      ef.emitter.pos = this.pos.add(ef.offset);
      
      const idx = this.fireEmitters.indexOf(ef);
      if (this.hp < 40) {
        ef.emitter.emitRate = 100;
      } else if (this.hp < 80) {
        ef.emitter.emitRate = (idx < 3) ? 80 : 0;
      } else if (this.hp < 120) {
        ef.emitter.emitRate = (idx < 2) ? 60 : 0;
      } else if (this.hp < 160) {
        ef.emitter.emitRate = (idx < 1) ? 40 : 0;
      } else {
        ef.emitter.emitRate = 0;
      }
    }
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, this.size, this.sprite, this.color);
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 1, 1);
      setTimeout(() => this.color = bossCfg.color.copy(), 50);
      
      if (this.hp <= 0) {
        this.destroy();
        for(const ef of this.fireEmitters) ef.emitter.destroy();
      }
      return false;
    }
    return false;
  }
}
