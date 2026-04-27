import {
  Color,
  drawCircle,
  drawTile,
  EngineObject,
  ParticleEmitter,
  Particle,
  PI,
  rand,
  rgb,
  setBlendMode,
  setCameraPos,
  time,
  Timer,
  vec2,
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
    200, // emitRate
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
    diameter * 20, // emitRate scaled by area/size
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
    size * 50, // emitRate
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
    0.2,
    size * 30,
    PI,
    sprites.get("smoke_04.png", system.particleSheetName),
    new Color(0.8, 0.8, 0.8, 0.4),
    new Color(0.4, 0.4, 0.4, 0.2),
    new Color(0, 0, 0, 0),
    new Color(0, 0, 0, 0),
    1.5, // particleTime
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

/**
 * Triggers a global screen shake.
 * @param {number} amplitude
 * @param {number} duration
 */
export function applyScreenShake(amplitude = 0.5, duration = 0.2) {
  new ScreenShaker(amplitude, duration);
}

/**
 * Calculates a shake offset for an entity.
 * @param {number} amplitude
 * @param {Timer} timer
 * @returns {import('./engine.js').Vector2}
 */
export function getEntityShake(amplitude, timer) {
  if (!timer || timer.elapsed()) return vec2(0);
  const percent = 1 - timer.getPercent();
  const shake = amplitude * percent;
  return vec2(rand(-shake, shake), rand(-shake, shake));
}

/**
 * Draws an additive flash pass for a sprite.
 * @param {import('./engine.js').Vector2} pos
 * @param {import('./engine.js').Vector2} size
 * @param {import('./sprites.js').TileInfo} tile
 * @param {import('./engine.js').Color} color
 * @param {number} angle
 * @param {boolean} mirrorX
 */
export function drawEntityFlash(pos, size, tile, color, angle, mirrorX) {
  setBlendMode(true);
  drawTile(pos, size, tile, color, angle, mirrorX);
  setBlendMode(false);
}

/**
 * Logic-only object to handle camera shake.
 */
class ScreenShaker extends EngineObject {
  constructor(amplitude, duration) {
    super();
    this.amplitude = amplitude;
    this.timer = new Timer(duration);
  }

  update() {
    const percent = this.timer.getPercent();
    if (percent >= 1) {
      setCameraPos(system.cameraPos);
      this.destroy();
      return;
    }

    const shake = this.amplitude * (1 - percent);
    setCameraPos(
      system.cameraPos.add(vec2(rand(-shake, shake), rand(-shake, shake))),
    );
  }

  render() {} // No visual representation
}

/**
 * Base class for effects attached to an entity.
 */
export class EntityEffect {
  constructor(duration) {
    this.timer = duration ? new Timer(duration) : null;
    this.renderUnder = false;
  }

  isDone() {
    return this.timer ? this.timer.elapsed() : false;
  }

  update() {}
  render() {}

  /** @returns {import('./engine.js').Vector2} */
  getOffset() {
    return vec2(0);
  }
}

/**
 * Additive flash pass with smooth fade-out.
 */
export class FlashEffect extends EntityEffect {
  constructor(color, duration = 0.1) {
    super(duration);
    this.color = color;
  }

  render(entity, renderPos, drawSize) {
    const color = this.color.copy();
    color.a *= 1 - this.timer.getPercent();

    drawEntityFlash(
      renderPos,
      drawSize,
      entity.sprite,
      color,
      entity.angle,
      entity.mirrorX,
    );
  }
}

/**
 * Local entity jitter/shake effect.
 */
export class ShakeEffect extends EntityEffect {
  constructor(amplitude, duration = 0.1) {
    super(duration);
    this.amplitude = amplitude;
    this.offset = vec2(0);
  }

  update() {
    const percent = 1 - this.timer.getPercent();
    const shake = this.amplitude * percent;
    this.offset = vec2(rand(-shake, shake), rand(-shake, shake));
  }

  getOffset() {
    return this.offset;
  }
}

/**
 * Visual knockback effect that pushes the entity in a direction.
 */
export class KnockbackEffect extends EntityEffect {
  constructor(direction, magnitude, duration = 0.2) {
    super(duration);
    this.direction = direction.normalize();
    this.magnitude = magnitude;
  }

  update(entity) {
    const percent = 1 - this.timer.getPercent();
    // Use a square decay for a punchier start
    const p = percent * percent;
    const shift = this.direction.scale(this.magnitude * p);
    entity.pos = entity.pos.add(shift);
  }

  getOffset() {
    return vec2(0);
  }
}

/**
 * Draws a configurable outline around an entity.
 */
export class OutlineEffect extends EntityEffect {
  constructor(color, thickness = 0.05, duration = null) {
    super(duration);
    this.color = color;
    this.thickness = thickness;
    this.renderUnder = true;
  }

  render(entity, renderPos, drawSize) {
    // Draw the sprite 8 times at small offsets to create an outline
    const t = this.thickness;
    const offsets = [
      vec2(-t, 0),
      vec2(t, 0),
      vec2(0, -t),
      vec2(0, t),
      vec2(-t, -t),
      vec2(t, -t),
      vec2(-t, t),
      vec2(t, t),
    ];

    offsets.forEach((offset) => {
      drawTile(
        renderPos.add(offset),
        drawSize,
        entity.sprite,
        this.color,
        entity.angle,
        entity.mirrorX,
      );
    });
  }
}

/**
 * Creates a fading trail of previous positions.
 */
export class TrailEffect extends EntityEffect {
  constructor(length = 5, duration = null) {
    super(duration);
    this.length = length;
    this.history = []; // Array of {pos, angle}
    this.renderUnder = true;
  }

  update(entity) {
    // Record current state
    this.history.unshift({
      pos: entity.pos.copy(),
      angle: entity.angle,
    });

    // Limit history length
    if (this.history.length > this.length) {
      this.history.pop();
    }
  }

  render(entity, renderPos, drawSize) {
    this.history.forEach((h, i) => {
      // Skip the first history point as it's the current position
      if (i === 0) return;

      const p = 1 - i / this.history.length;
      const color = entity.color.copy();
      color.a *= p * 0.5; // Fading trail

      // drawSize already handles mirrorY logic from BaseEntity
      const trailDrawSize = drawSize.scale(p);

      drawTile(
        h.pos,
        trailDrawSize,
        entity.sprite,
        color,
        h.angle,
        entity.mirrorX,
      );
    });
  }
}

/**
 * Pulsing flash effect that oscillates the entity's brightness.
 */
export class PulseEffect extends EntityEffect {
  constructor(color = new Color(1, 1, 1, 0.5), speed = 4.0, duration = null) {
    super(duration); // Support optional duration
    this.color = color;
    this.speed = speed;
  }

  render(entity, renderPos, drawSize) {
    // Sin wave from 0 to peak alpha
    const p = (Math.sin(time * this.speed) + 1) / 2;
    const color = this.color.copy();
    color.a *= p;

    drawEntityFlash(
      renderPos,
      drawSize,
      entity.sprite,
      color,
      entity.angle,
      entity.mirrorX,
    );
  }
}

/**
 * Creates a punchy particle burst for piercing hits.
 * @param {import('./engine.js').Vector2} pos
 * @param {number} angle
 * @param {number} size
 */
export function spawnPierceEffect(pos, angle, size) {
  new ParticleEmitter(
    pos,
    angle, // Emit in the direction of the bullet
    0.5, // emitSize
    0.1, // emitTime
    30, // emitRate
    PI / 6, // emitConeAngle (tight cone)
    sprites.get("trace_01.png", system.particleSheetName),
    new Color(1, 1, 0.5), // colorStartA
    new Color(1, 0.8, 0.2), // colorStartB
    new Color(1, 0.5, 0, 0), // colorEndA
    new Color(1, 0.2, 0, 0), // colorEndB
    0.3, // particleTime
    2 * size, // sizeStart
    0.1 * size, // sizeEnd
    0.2, // speed (fast)
    0.0, // angleSpeed
    0.9, // damping
    0.9, // angleDamping
    0, // gravityScale
    0, // particleConeAngle
    0.2, // fadeRate
    0, // randomness
    false, // collideTiles
    true, // additive
  );
}

/**
 * Spawns a muzzle flash parented to an entity.
 * @param {import('./engine.js').EngineObject} entity
 * @param {import('./engine.js').Vector2} offset
 * @param {number} sizeScale
 */
export function spawnMuzzleFlash(entity, offset, sizeScale = 1) {
  const flashEmitter = new ParticleEmitter(
    entity.pos,
    0, // angle
    0, // emitSize
    0.6, // emitTime
    1, // emitRate
    0, // emitConeAngle
    sprites.get("muzzle_05.png", system.particleSheetName),
    rgb(1, 1, 1),
    rgb(1, 1, 1),
    rgb(1, 0.2, 0, 0),
    rgb(1, 0, 0, 0),
    0.15, // particleTime
    3.5 * sizeScale, // sizeStart
    0.2 * sizeScale, // sizeEnd
    0, // speed
    0, // angleSpeed
    0, // damping
    0, // angleDamping
    0, // gravityScale
    0, // particleConeAngle
    0.1, // fadeRate
    0.1, // randomness
    false, // collideTiles
    true, // additive
    true, // randomColorLinear
    -1, // renderOrder
    true, // localSpace
  );
  // Push the flash further forward as it grows to keep it clear of the body
  const forwardOffset = 0.6 + sizeScale * 0.4;
  entity.addChild(flashEmitter, offset.add(vec2(0, forwardOffset)));
}

/**
 * Expanding concentric shockwave rings.
 */
export class ShockwaveEffect extends EntityEffect {
  constructor(
    color = new Color(1, 1, 1, 1),
    duration = 1.0,
    range = 2.0,
    ringCount = 3,
  ) {
    super(duration);
    this.color = color;
    this.range = range;
    this.ringCount = ringCount;
    this.renderUnder = true; // Draw behind the entity so it doesn't obscure it
  }

  render(entity, renderPos) {
    const p = this.timer.getPercent();
    for (let i = 0; i < this.ringCount; i++) {
      // Offset each ring's phase so they appear to flow outward
      const ringP = (p + i / this.ringCount) % 1;

      // Radius starts small and expands to range
      const radius = entity.visualSize.x * (0.5 + ringP * this.range);

      // Alpha fades as the ring expands (quadratic falloff for softness)
      const alpha = (1 - ringP) ** 2 * this.color.a;

      const color = this.color.copy();
      color.a = alpha;

      // Draw as an outline for a "ring" look
      drawCircle(renderPos, radius, color, 0.15);
    }
  }
}

/**
 * Swarm of energy particles gathering into the entity center.
 * Uses a particle emitter for an organic, textured energy look.
 */
export class GatheringChargeEffect extends EntityEffect {
  constructor(
    color = new Color(1, 1, 1, 0.5),
    duration = 1.5,
    radius = 6.0,
    count = 16,
  ) {
    super(duration);
    this.color = color;
    this.radius = radius;
    this.count = count;
    this.renderUnder = true;

    // Create a manual emitter (emitRate = 0) to handle the visuals
    this.emitter = new ParticleEmitter(
      vec2(0),
      0,
      0,
      0,
      0,
      0,
      sprites.get("star_02.png", system.particleSheetName),
      color,
      color,
      color,
      color,
      0.15,
      0.5,
      0.3,
      0,
      0,
      1,
      1,
      0,
      0,
      0,
      0.2,
      false,
      true, // additive
      true, // randomColorLinear
      -1, // renderOrder: set to -1 to render behind the boss
    );
  }

  isDone() {
    const done = super.isDone();
    if (done) this.emitter.destroy(); // Clean up emitter when effect is done
    return done;
  }

  render(entity, renderPos) {
    const p = this.timer.getPercent();

    for (let i = 0; i < this.count; i++) {
      // Add slight randomness to seeds to make it less 'grid-like'
      const seed = i * 1.5 + (i % 3) * 0.2;
      const angle = (seed + time * 5) % (PI * 2);

      // particleP goes from 0 to 1 repeatedly, offset by seed
      const particleP = (p + seed) % 1;

      // Particles move from outer radius to center
      const dist = this.radius * (1 - particleP);

      // Calculate position around the entity
      const pos = renderPos.add(
        vec2(Math.cos(angle), Math.sin(angle)).scale(dist),
      );

      // Scale and alpha increase as they get closer to the center
      const size = 1.6 * particleP;
      const color = this.color.copy();
      color.a *= particleP;

      // Manually spawn a particle at the calculated spiral point
      // We add a tiny bit of jitter to the position for variety
      const particlePos = pos.add(vec2(rand(-0.1, 0.1), rand(-0.1, 0.1)));
      const particle = new Particle(
        this.emitter,
        particlePos,
        0, // angle
        color,
        color, // colorStart/End
        0.15, // lifetime
        size,
        size * 0.5, // sizeStart/End
        vec2(0), // velocity
        0, // angleVelocity
      );
      this.emitter.particles.push(particle);
    }
  }
}

/**
 * High-tech geometric targeting frame that rotates and shrinks.
 * Uses crosshair sprites for a sharp HUD look.
 */
export class TargetingFrameEffect extends EntityEffect {
  constructor(color = new Color(1, 1, 1, 0.5), duration = 1.5, radius = 8.0) {
    super(duration);
    this.color = color;
    this.radius = radius;
    this.renderUnder = true; // Stay behind the boss

    // Cache the crosshair sprites from the particle sheet
    this.spriteOuter = sprites.get(
      "crosshair133.png",
      system.particleSheetName,
    );
    this.spriteInner = sprites.get(
      "crosshair017.png",
      system.particleSheetName,
    );
  }

  render(entity, renderPos) {
    const p = this.timer.getPercent();

    // Pulse alpha for a 'scanning' feel
    const alpha = this.color.a * (0.6 + 0.4 * Math.sin(time * 20));
    const color = this.color.copy();
    color.a = alpha;

    // Shrink from initial radius toward the entity (with faster interpolation)
    const shrink = Math.pow(1 - p, 1.5);
    const r = this.radius * shrink + entity.visualSize.x * 0.7;

    // Render outer frame (slow rotation)
    if (this.spriteOuter) {
      drawTile(renderPos, vec2(r * 2), this.spriteOuter, color, time * 0.5);
    }

    // Render inner frame (faster counter-rotation)
    if (this.spriteInner) {
      drawTile(renderPos, vec2(r * 1.2), this.spriteInner, color, -time * 2);
    }
  }
}
