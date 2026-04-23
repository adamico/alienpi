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
    4, // emitSize
    0.1, // emitTime
    100, // emitRate
    PI * 2, // emitConeAngle
    sprites.get("scorch_02.png", system.particleSheetName),
    new Color(1, 0.8, 0.3), // colorStartA
    new Color(1, 0.5, 0.1), // colorStartB
    new Color(0.5, 0.5, 0.5, 0), // colorEndA
    new Color(0.2, 0.2, 0.2, 0), // colorEndB
    0.4, // particleTime
    1.5, // sizeStart
    0.2, // sizeEnd
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
