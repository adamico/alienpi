import {
  EngineObject,
  drawTile,
  ParticleEmitter,
  Color,
  rgb,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { boss as bossCfg } from "../config.js";
import { sprites } from "../sprites.js";
import { Bullet } from "./bullet.js";

export class Boss extends EngineObject {
  constructor(pos) {
    const tile = sprites.get(bossCfg.sprite);
    super(pos, bossCfg.size);
    
    this.sprite = tile;
    this.hp = bossCfg.hp;
    this.maxHp = bossCfg.hp;
    this.color = bossCfg.color.copy();
    
    this.setCollision(true);
    this.mass = 0; // Static but movable
    
    this.fireEmitters = [];
    this.initEmitters();
  }

  initEmitters() {
    for (const offset of bossCfg.fireLocations) {
      const emitter = new ParticleEmitter(
        this.pos.add(offset), 0, 0.2, 0.1, 50, Math.PI, // pos, angle, emitSize, emitTime, emitRate, emitCone
        undefined, // tileInfo
        rgb(1, 0.5, 0), rgb(1, 0.2, 0), // colorStartA, colorStartB
        rgb(1, 0.5, 0, 0), rgb(1, 0.2, 0, 0), // colorEndA, colorEndB
        0.5, 0.1, 0.2, 0.05, 0.05, // particleTime, sizeStart, sizeEnd, speed, angleSpeed
        0.95, 1, 1, Math.PI, 0.1, // damping, angleDamping, gravityScale, particleCone, fadeRate
        0.2, false, true // randomness, collide, additive
      );
      emitter.emitRate = 0;
      this.fireEmitters.push({ offset, emitter });
    }
  }

  update() {
    // Movement: slow oscillate
    this.pos.x += Math.sin(performance.now() * 0.001) * bossCfg.speed;
    
    // Update emitter positions
    for (const ef of this.fireEmitters) {
      ef.emitter.pos = this.pos.add(ef.offset);
      
      // HP thresholds for fire
      const hpRatio = this.hp / this.maxHp;
      if (hpRatio < 0.25) {
        ef.emitter.emitRate = 100;
      } else if (hpRatio < 0.5) {
        // Only some segments if < 1/2? 
        // User said "four locations Signifying the boss is at <3/4, <1/2 and <1/4 health"
        // Let's interpret as: 
        // < 3/4 -> 1 fire? No, maybe intensity increases.
        // Let's do: 1 fire at 3/4, 2 at 1/2, 4 at 1/4.
        const idx = this.fireEmitters.indexOf(ef);
        if (idx < 2) ef.emitter.emitRate = 50;
      } else if (hpRatio < 0.75) {
        const idx = this.fireEmitters.indexOf(ef);
        if (idx < 1) ef.emitter.emitRate = 30;
      } else {
        ef.emitter.emitRate = 0;
      }
    }
    
    super.update();
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
        // Boss explosion?
        this.destroy();
        for(const ef of this.fireEmitters) ef.emitter.destroy();
      }
      return false;
    }
    return false;
  }
}
