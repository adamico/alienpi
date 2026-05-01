import {
  vec2,
  drawLine,
  Color,
  EngineObject,
  ParticleEmitter,
  PI,
  rand,
  rgb,
} from "../engine.js";
import { system, weapons } from "../config/index.js";
import { sprites } from "../sprites.js";
import { soundExplosion1 } from "../sounds.js";
import { addScoreAt } from "../score.js";
import { recordDamage } from "../dpsTracker.js";
import * as gameEffects from "../gameEffects.js";

/**
 * A single Ghostbuster-style tether. Parented to Player at the latch nozzle
 * offset so `this.pos` is kept in sync automatically; the beam ticks damage,
 * emits sparks, and renders itself via the engine render loop.
 */
export class LatchBeam extends EngineObject {
  constructor() {
    super(vec2(), vec2());
    this.mass = 0;
    this.renderOrder = weapons.latch.renderOrder;
    this.target = null;
    this.damageFrame = 0;
    this.endOffset = null;
    this.fanAngle = 0;
    this.isFiring = false;

    // Continuous star emitter at the latch point
    const cfg = weapons.latch;
    const lp = cfg.latchPoint;
    const color = lp.color.copy();
    color.a = lp.alpha;
    this.latchEmitter = new ParticleEmitter(
      vec2(),
      0,
      0,
      0,
      0,
      0,
      sprites.get("star_09.png", system.particleSheetName),
      color,
      color,
      rgb(0, 1, 0, 0),
      rgb(0, 0.5, 0, 0),
      lp.particleTime,
      lp.sizeStart,
      lp.sizeEnd,
      0.05, // speed
      0.05, // angleSpeed
      0.9, // damping
      0.9, // angleDamping
      0, // gravityScale
      PI, // particleConeAngle
      0.1, // fadeRate
      0.2, // randomness
      false, // collideTiles
      true, // additive
      true, // randomColorLinear
      this.renderOrder + 1,
      true, // localSpace
    );
    this.addChild(this.latchEmitter);
  }

  setTarget(target) {
    if (this.target !== target) {
      this.target = target;
      this.damageFrame = 0;
    }
  }

  clear() {
    this.target = null;
    this.damageFrame = 0;
    this.isFiring = false;
  }

  update() {
    super.update();

    const cfg = weapons.latch;
    const level = this.parent?.weaponLevels?.latch || 1;
    const range = cfg.range[level - 1];

    let endPos;
    if (this.target && !this.target.destroyed && this.target.hp > 0) {
      const interval = cfg.cooldown[level - 1];
      const dmg = cfg.damage[level - 1];

      this.damageFrame++;
      if (this.damageFrame >= interval) {
        this.damageFrame = 0;
        this.target.hp -= dmg;
        recordDamage("latch", dmg, this.target);
        if (typeof this.target.applyEffect === "function") {
          this.target.applyEffect(
            new gameEffects.FlashEffect(new Color(1, 1, 1), 0.05),
          );
        }
        this.emitImpactSparks();
        if (this.target.hp <= 0) {
          soundExplosion1.play();
          if (this.target.scoreOnKill) {
            addScoreAt(this.target.pos, this.target.scoreOnKill);
          }
          this.target.destroy();
          this.target = null;
        }
      }
    }

    if (this.target) {
      endPos = this.endOffset
        ? this.target.pos.add(this.endOffset)
        : this.target.pos;
    } else if (this.isFiring) {
      // Fan pattern endpoint
      const dir = vec2(Math.sin(this.fanAngle), Math.cos(this.fanAngle));
      endPos = this.pos.add(dir.scale(range));
    }

    if (endPos) {
      this.latchEmitter.localPos = endPos.subtract(this.pos);
      this.latchEmitter.emitRate = cfg.latchPoint.emitRate;
      this.emitBeamSparks(this.pos, endPos);
    } else {
      this.latchEmitter.emitRate = 0;
    }
  }

  emitImpactSparks() {
    const pos = this.endOffset
      ? this.target.pos.add(this.endOffset)
      : this.target.pos;
    gameEffects.spawnLatchImpactSpark(pos, weapons.latch.sparks);
  }

  emitBeamSparks(fromPos, endPos) {
    const s = weapons.latch.beamSparks;
    if (rand() > s.spawnChance) return;
    const t = rand();
    const pos = fromPos.lerp(endPos, t);
    gameEffects.spawnLatchBeamSpark(pos, s);
  }

  render() {
    if (!this.target && !this.isFiring) return;

    const cfg = weapons.latch;
    const level = this.parent?.weaponLevels?.latch || 1;
    const range = cfg.range[level - 1];

    let endPos;
    if (this.target) {
      endPos = this.endOffset
        ? this.target.pos.add(this.endOffset)
        : this.target.pos;
    } else {
      // Use the stored angle for the fan pattern
      const dir = vec2(Math.sin(this.fanAngle), Math.cos(this.fanAngle));
      endPos = this.pos.add(dir.scale(range));
    }

    if (endPos) {
      const color = cfg.color;
      const glowColor = color.copy();
      glowColor.a *= 0.3;
      const coreColor = rgb(1, 1, 1, 0.8);

      // Add slight jitter to the endpoint for a more "energetic" feel
      const jitter = vec2(rand(-0.05, 0.05), rand(-0.05, 0.05));
      const jEndPos = endPos.add(jitter);

      // 1. Outer Glow (Thick and soft)
      drawLine(this.pos, jEndPos, cfg.lineWidth * 3, glowColor);
      // 2. Main Beam (Medium)
      drawLine(this.pos, jEndPos, cfg.lineWidth, color);
      // 3. Hot Core (Thin and bright)
      drawLine(this.pos, jEndPos, cfg.lineWidth * 0.3, coreColor);
    }
    super.render();
  }
}
