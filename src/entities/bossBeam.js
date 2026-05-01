import {
  vec2,
  rgb,
  rand,
  engineObjectsCallback,
  Timer,
  EngineObject,
  drawRect,
  lerp,
} from "../engine.js";
import { beam as beamCfg } from "../config/index.js";
import { player } from "./player.js";
import { soundBossBeam, soundBossBeamCharge } from "../audio/sounds.js";
import { playSfx } from "../audio/soundManager.js";

/**
 * Rotating beam hazard.
 * A rectangle centered at the boss's position, with a length equal to the beamLength.
 * The beam rotates around the boss's position at beamRotationSpeed.
 * The beam should not hurt the player until the startTimer has elapsed.
 * The beam is destroyed when the lifeTimer has elapsed.
 */
export class BossBeam extends EngineObject {
  constructor(rotationDirection = 1) {
    super(vec2(), vec2(beamCfg.length, beamCfg.width));
    this.setCollision(false, false);
    this.mass = 0;
    this.isEnemy = true;
    this.noDestroyOnImpact = true;
    this.renderOrder = -1;
    this.rotationDirection = rotationDirection;

    this.state = "starting";
    this.startTimer = new Timer(beamCfg.startDuration); // charge telegraph duration
    this.lifeTimer = new Timer(); // will be set when active
    this.endTimer = new Timer(); // will be set when ending
    this.soundTimer = 0; // retriggers soundBossBeam while active
    playSfx(soundBossBeamCharge, vec2(), 0.25);
  }

  update() {
    if (!this.parent) return;

    this.updateState();
    this.updateRotation();
    this.updateColor();
    this.updateSize();
    this.updateSound();
    super.update();

    if (
      (this.state === "active" || this.state === "ending") &&
      !this.destroyed
    ) {
      // Manual collision check since child objects skip engine-level collision
      // We use a custom oriented check because LittleJS 1.x is AABB only
      engineObjectsCallback(this.pos, vec2(this.size.x), (o) => {
        if (o === player && !o.destroyed) {
          // Rotate the distance vector into the beam's local space to check bounds
          const diff = o.pos.subtract(this.pos);
          const rotatedDiff = diff.rotate(-this.angle);

          const halfSizeX = this.size.x / 2;
          const halfSizeY = this.size.y / 2;
          const playerBufferX = o.size.x / 2;
          const playerBufferY = o.size.y / 2;

          if (
            Math.abs(rotatedDiff.x) < halfSizeX + playerBufferX &&
            Math.abs(rotatedDiff.y) < halfSizeY + playerBufferY
          ) {
            this.collideWithObject(o);
            o.collideWithObject(this);
          }
        }
      });
    }
  }

  updateState() {
    if (this.state === "starting" && this.startTimer.elapsed()) {
      this.state = "active";
      this.lifeTimer.set(beamCfg.duration / 60);
    } else if (this.state === "active" && this.lifeTimer.elapsed()) {
      this.state = "ending";
      this.endTimer.set(beamCfg.endDuration / 60);
    } else if (this.state === "ending" && this.endTimer.elapsed()) {
      this.destroy();
    }
  }

  updateRotation() {
    this.localAngle += beamCfg.rotationSpeed * this.rotationDirection;
  }

  updateColor() {
    if (this.state === "starting") {
      // Telegraph: pulsing yellow/orange warning effect
      const pulse =
        Math.sin(this.startTimer.getPercent() * Math.PI * 4) * 0.5 + 0.5;
      const baseAlpha = 0.5 + pulse * 0.3; // pulses between 0.5-0.8
      this.color = rgb(1, 0.7, 0, baseAlpha); // Yellow-orange warning
    } else {
      this.color = rgb(1, 0, 0, 0.7); // Active / Ending (red)
    }
  }

  updateSound() {
    if (this.state !== "active") {
      this.soundTimer = 0;
      return;
    }
    if (this.soundTimer <= 0) {
      playSfx(soundBossBeam, vec2(), 0.2);
      // Retrigger spaced so the long release tail overlaps into a continuous
      // hum rather than re-attacking each cycle.
      this.soundTimer = 36;
    } else {
      this.soundTimer--;
    }
  }

  updateSize() {
    let targetScale = 0;

    if (this.state === "starting") {
      targetScale = this.startTimer.getPercent();
    } else if (this.state === "active") {
      targetScale = 1;
    } else if (this.state === "ending") {
      targetScale = 1 - this.endTimer.getPercent();
    }

    // Apply smoothstep easing to make the animation feel more premium
    const p = targetScale * targetScale * (3 - 2 * targetScale);

    this.size.x = lerp(0, beamCfg.length, p);
    this.size.y = lerp(0, beamCfg.width, p);
  }

  render() {
    const color = this.color;
    const glowColor = color.copy();
    glowColor.a *= 0.3;
    // Scale core alpha based on the beam's current alpha (for fading)
    const coreColor = rgb(1, 1, 1, 0.8 * (color.a / 0.7));

    // Add slight rotation jitter for an "unstable energy" effect
    const jitter = rand(-0.01, 0.01);
    const renderAngle = this.angle + jitter;

    // During telegraph: add dramatic expanding glow for more visibility
    if (this.state === "starting") {
      const glowScale = 1 + this.startTimer.getPercent() * 0.5; // Expands during charge
      drawRect(
        this.pos,
        vec2(this.size.x * glowScale, this.size.y * glowScale * 1.5),
        glowColor,
        renderAngle,
      );
    } else {
      // 1. Subtle Glow (Close to hitbox to avoid confusion)
      drawRect(
        this.pos,
        vec2(this.size.x, this.size.y * 1.2),
        glowColor,
        renderAngle,
      );
    }

    // 2. Main Beam (Matches hitbox)
    drawRect(this.pos, this.size, color, renderAngle);

    // 3. Hot Core (Thin and bright)
    drawRect(
      this.pos,
      vec2(this.size.x, this.size.y * 0.3),
      coreColor,
      renderAngle,
    );
  }
}
