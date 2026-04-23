import {
  ParticleEmitter,
  Color,
  PI,
  EngineObject,
  vec2,
  Timer,
  drawCircle,
} from "./engine.js";
import { sprites } from "./sprites.js";
import { system } from "./config.js";

/**
 * Creates a standard explosion at the given position.
 * @param {import('./engine.js').Vector2} pos
 */
export function explode(pos, size) {
  const s = Math.max(1.2, size); // Minimum effective size for visual punch

  // --- STAGE 1: Instant Flash Circle ---
  new FlashCircle(pos, s * 1.5);

  // --- STAGE 2: Expanding Fireball ---
  new ParticleEmitter(
    pos,
    0, // angle
    s * 0.5, // emitSize
    0.2, // emitTime
    400, // emitRate
    PI * 2, // emitConeAngle
    sprites.get("scorch_02.png", system.particleSheetName),
    new Color(1, 0.8, 0.2, 1), // colorStartA
    new Color(1, 0.4, 0, 1), // colorStartB
    new Color(0.4, 0.1, 0, 0), // colorEndA
    new Color(0.2, 0, 0, 0), // colorEndB
    0.8, // particleTime (Doubled for slower burn)
    s * 1.0, // sizeStart
    s * 3.5, // sizeEnd
    0.08, // speed
    0.05, // angleSpeed
    0.95, // damping (High damping to keep fireball tight)
    1, // angleDamping
    0, // gravityScale
    PI * 2, // particleConeAngle
    0.2, // fadeRate (Slower fade)
    0.4, // randomness
    0, // additive
  );

  // --- STAGE 3: Lingering Smoke ---
  spawnSmokeBurst(pos, s);

  // --- STAGE 4: Textureless Debris ---
  spawnDebris(pos, s);
}

/**
 * Creates a large, intense explosion for missiles.
 * @param {import('./engine.js').Vector2} pos
 * @param {number} diameter
 */
export function missileExplode(pos, diameter) {
  new ParticleEmitter(
    pos,
    0, // angle
    diameter, // emitSize (radius-ish spread)
    0.2, // emitTime
    diameter * 50, // emitRate scaled by area/size
    PI * 2, // emitConeAngle
    sprites.get("scorch_03.png", system.particleSheetName),
    new Color(1, 0.5, 0.2), // colorStartA
    new Color(1, 1, 0.5), // colorStartB
    new Color(0.2, 0.2, 0.2, 0), // colorEndA
    new Color(0.1, 0.1, 0.1, 0), // colorEndB
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

  spawnSmokeBurst(pos, diameter);
  spawnDebris(pos, diameter);
}

/**
 * Helper to spawn drifting space debris.
 * @param {import('./engine.js').Vector2} pos
 * @param {number} size
 */
function spawnDebris(pos, size) {
  new ParticleEmitter(
    pos,
    0, // angle
    size * 0.3, // emitSize
    0.1, // emitTime
    size * 100, // emitRate
    PI * 2, // emitConeAngle
    0, // <--- Textureless
    new Color(0.8, 0.8, 0.8, 1), // colorStartA (Grayscale / Silver)
    new Color(0.3, 0.3, 0.3, 1), // colorStartB (Dark Grey)
    new Color(0.1, 0.1, 0.1, 0), // colorEndA
    new Color(0, 0, 0, 0), // colorEndB
    1.5, // particleTime
    0.15, // sizeStart
    0.1, // sizeEnd
    0.1, // speed (Slower drift)
    0.1, // angleSpeed
    0.99, // damping (High damping for slow space drift)
    0.99, // angleDamping
    0, // gravityScale (No gravity in space)
    PI * 2, // particleConeAngle
    0.05, // fadeRate
    0.8, // randomness
  );
}

/**
 * Helper to spawn a burst of smoke.
 * @param {import('./engine.js').Vector2} pos
 * @param {number} size
 */
function spawnSmokeBurst(pos, size) {
  new ParticleEmitter(
    pos,
    0,
    size, // Larger initial spread
    0.3,
    size * 60,
    PI,
    sprites.get("smoke_04.png", system.particleSheetName),
    new Color(0.8, 0.8, 0.8, 0.4),
    new Color(0.4, 0.4, 0.4, 0.2),
    new Color(0, 0, 0, 0),
    new Color(0, 0, 0, 0),
    3.0, // particleTime
    Math.max(1.2, size * 0.5), // sizeStart
    Math.max(2.5, size * 0.8), // sizeEnd (Reduced from 5.0x to be proportional)
    0.02,
    0.01,
    0.99,
    1,
    -0.005,
    PI * 2,
    0.02,
    0.3,
    false,
    false,
  );
}

/**
 * Short-lived cosmetic flash circle.
 */
class FlashCircle extends EngineObject {
  constructor(pos, diameter) {
    super(pos, vec2(diameter));
    this.timer = new Timer(0.1); // Extremely fast
    this.renderOrder = 100;
  }
  update() {
    if (this.timer.elapsed()) this.destroy();
    super.update();
  }
  render() {
    const p = this.timer.getPercent();
    // Expanding and fading out
    drawCircle(
      this.pos,
      this.size.x * (1 + p * 0.5),
      new Color(1, 1, 1, 1 - p),
    );
  }
}
