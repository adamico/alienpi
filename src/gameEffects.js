import { ParticleEmitter, Color, PI } from "./engine.js";
import { sprites } from "./sprites.js";
import { system } from "./config.js";

/**
 * Creates a standard explosion at the given position.
 * @param {import('./engine.js').Vector2} pos
 */
export function explode(pos, size) {
  new ParticleEmitter(
    pos,
    0, // angle
    size, // emitSize
    0.1, // emitTime
    500, // emitRate
    PI, // emitConeAngle
    sprites.get("scorch_02.png", system.particleSheetName),
    new Color(1, 0.867, 0, 1), // colorStartA
    new Color(0.341, 0, 0, 1), // colorStartB
    new Color(0.239, 0.22, 0, 0), // colorEndA
    new Color(1, 0, 0, 0), // colorEndB
    0.5, // particleTime
    4, // sizeStart
    0.15, // sizeEnd
    0.03, // speed
    0.05, // angleSpeed
    1, // damping
    1, // angleDamping
    0, // gravityScale
    3.14, // particleConeAngle
    0.2, // fadeRate
    0.25, // randomness
    0, // additive
    1, // randomColorLinear
  );

  // Secondary smoke burst
  new ParticleEmitter(
    pos,
    0,
    size,
    0.3,
    500,
    PI,
    sprites.get("smoke_04.png", system.particleSheetName),
    new Color(0.8, 0.8, 0.8, 0.5),
    new Color(0.4, 0.4, 0.4, 0.3),
    new Color(0, 0, 0, 0),
    new Color(0, 0, 0, 0),
    0.8,
    1.0,
    2.5,
    0.02,
    0.01,
    0.95,
    1,
    -0.01, // slight upward drift
    PI * 2,
    0.05,
    0.2,
    false,
    false,
  );
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
}
