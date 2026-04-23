import { ParticleEmitter, Color, PI } from "./engine.js";
import { sprites } from "./sprites.js";
import { system } from "./config.js";

/**
 * Creates a standard explosion at the given position.
 * @param {import('./engine.js').Vector2} pos
 */
export function explode(pos) {
  new ParticleEmitter(
    pos,
    0, // angle
    3, // emitSize
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
}
