import {
  vec2,
  drawLine,
  Color,
  EngineObject,
  ParticleEmitter,
  PI,
  rand,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { system, weapons } from "../config.js";
import { sprites } from "../sprites.js";
import { soundExplosion1 } from "../sounds.js";

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
  }

  update() {
    super.update();
    if (!this.target || this.target.destroyed || this.target.hp <= 0) {
      this.target = null;
      return;
    }
    const cfg = weapons.latch;
    this.damageFrame++;
    if (this.damageFrame >= cfg.damageInterval) {
      this.damageFrame = 0;
      this.target.hp--;
      if (typeof this.target.applyHitEffect === "function") {
        this.target.applyHitEffect({
          flashColor: new Color(1, 1, 1),
          duration: 0.05,
        });
      }
      this.emitImpactSparks();
      if (this.target.hp <= 0) {
        soundExplosion1.play();
        this.target.destroy();
        this.target = null;
        return;
      }
    }
    this.emitBeamSparks(this.pos);
  }

  emitImpactSparks() {
    const pos = this.endOffset
      ? this.target.pos.add(this.endOffset)
      : this.target.pos;
    this.spawnSparkEmitter(pos, weapons.latch.sparks);
  }

  emitBeamSparks(fromPos) {
    const s = weapons.latch.beamSparks;
    if (rand() > s.spawnChance) return;
    const endPos = this.endOffset
      ? this.target.pos.add(this.endOffset)
      : this.target.pos;
    const t = rand();
    const pos = fromPos.lerp(endPos, t);
    this.spawnSparkEmitter(pos, s);
  }

  spawnSparkEmitter(pos, s) {
    const spriteName = s.sprites[Math.floor(rand(s.sprites.length))];
    const tile = sprites.get(spriteName, system.particleSheetName);
    new ParticleEmitter(
      pos,
      0,
      s.emitSize,
      s.emitTime,
      s.emitRate,
      s.coneAngle,
      tile,
      s.colorStartA,
      s.colorStartB,
      s.colorEndA,
      s.colorEndB,
      s.particleTime,
      s.sizeStart,
      s.sizeEnd,
      s.speed,
      s.angleSpeed,
      s.damping,
      s.angleDamping,
      0, // gravityScale
      PI, // particleConeAngle
      s.fadeRate,
      s.randomness,
      false, // collideTiles
      true, // additive
      s.randomColorLinear,
      s.renderOrder,
      s.localSpace,
    );
  }

  render() {
    if (!this.target) return;
    const cfg = weapons.latch;
    const endPos = this.endOffset
      ? this.target.pos.add(this.endOffset)
      : this.target.pos;
    drawLine(this.pos, endPos, cfg.lineWidth, cfg.color);
  }
}
