import {
  vec2,
  Color,
  rgb,
  rand,
  engineObjectsCallback,
  Timer,
  drawLine,
  time,
} from "../engine.js";
import * as gameEffects from "../gameEffects.js";
import {
  orbiter as orbCfg,
  orbiterLooter as orbLootCfg,
  player as playerCfg,
} from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { Loot } from "./loot.js";
import { addScoreAt, SCORE } from "../score.js";

/**
 * Defensive pods that orbit the boss
 */
export class BossOrbiter extends BaseEntity {
  constructor(initialAngle, hp, hasLoot = false, pos = vec2()) {
    const cfg = hasLoot ? orbLootCfg : orbCfg;
    super(
      pos,
      cfg.sprite,
      cfg.sheet,
      cfg.hitboxScale,
      cfg.size,
      cfg.mirrorX,
      cfg.mirrorY,
    );
    this.cfg = cfg;
    this.angleOffset = initialAngle;
    this.hp = hp ?? cfg.baseHp;
    this.hasLoot = hasLoot;
    this.color = cfg.color.copy();
    this.mass = 0;
    this.isSolid = false;
    this.setCollision(false, false); // No collision while appearing
    this.renderOrder = -1; // Render below the boss
    this.baseVisualSize = this.visualSize.copy(); // V8: For warp-in scaling
    this.state = "appearing";
    this.appearTimer = new Timer(cfg.appearTime);
    this.diveTimer = new Timer(
      rand(cfg.diveRate * 0.5, cfg.diveRate * 1.5) / 60,
    );
    this.warningTimer = new Timer();
    this.tetherColor = this.color.copy();
    this.isEnemy = true;
    this.spawnPos = this.pos.copy();

    if (this.hasLoot) {
      // Golden outline to signify valuable cargo
      this.applyEffect(new gameEffects.OutlineEffect(rgb(1, 0.8, 0), 0.08));
      // Subtle golden pulse
      this.applyEffect(new gameEffects.PulseEffect(rgb(1, 0.9, 0.2, 0.3), 3.0));
      this.addChild(gameEffects.spawnLootSparkles(this.pos, this.size.x * 0.5));
    }
  }

  destroy() {
    if (this.destroyed) return;

    if (this.hasLoot) {
      const lootKeys =
        playerCfg.weaponSystem.mode === "ACTIVE"
          ? ["star"]
          : ["blue", "green", "red", "star"];
      const key = lootKeys[Math.floor(rand(lootKeys.length))];
      new Loot(this.pos.copy(), key);
    }

    super.destroy();
  }

  update() {
    // Handle state transitions
    if (this.state === "appearing") {
      if (this.appearTimer.elapsed()) {
        this.state = "orbiting";
        this.setCollision(true, false);
      }
    }

    // AI/Movement logic
    if (this.state === "appearing") {
      this.updateOrbit();
    } else if (this.state === "orbiting") {
      this.updateOrbit();
      if (this.diveTimer.elapsed()) {
        this.state = "warning";
        this.warningTimer.set(this.cfg.warningTime);
      }
    } else if (this.state === "warning") {
      this.updateOrbit(); // still orbit while warning
      if (this.warningTimer.elapsed()) {
        this.state = "diving";
        // Lock world position for dive
        this.diveX = this.pos.x;
      }
    } else if (this.state === "diving") {
      this.updateDive();
    } else if (this.state === "returning") {
      this.updateReturn();
    }

    // Freeze the orbital angle while the orbiter is detached from the ring —
    // otherwise the target position drifts faster than the return speed at
    // higher boss stages and the orbiter gets stuck chasing forever.
    if (
      this.parent &&
      this.state !== "diving" &&
      this.state !== "returning"
    ) {
      const speedScale = 1 + this.parent.stage * 0.25;
      this.angleOffset += this.cfg.speed * speedScale;
    }

    super.update();

    // Collision check - required because LittleJS ignores children in its main loop
    if (this.state !== "returning" && this.state !== "appearing") {
      engineObjectsCallback(this.pos, this.size, (o) => {
        if (!o.destroyed && o !== this && this.isOverlappingObject(o)) {
          this.collideWithObject(o);
          o.collideWithObject(this);
        }
      });
    }
  }

  updateOrbit() {
    if (this.parent) {
      this.localAngle = this.angleOffset;
      this.localPos = vec2(
        Math.cos(this.angleOffset),
        Math.sin(this.angleOffset),
      ).scale(this.cfg.radius);
    } else {
      this.pos = this.spawnPos.copy();
    }

    if (this.state === "appearing") {
      // V8: Variable-frequency blink (rapid -> slow)
      this.visualSize = this.baseVisualSize.copy();

      // Use getPercent() (0 -> 1) to get the true remaining fraction (1 -> 0)
      const t = 1 - this.appearTimer.getPercent();

      // Phase integral for a slowing blink.
      // Multiplier of 50 caps max frequency at ~15Hz (at t=1.0),
      // which safely avoids aliasing with the 60FPS engine rate.
      const phase = t * t * 50;

      // Force solid for the last 0.1s so it anchors before activating
      const isVisible = Math.sin(phase) > 0 || t < 0.1;

      this.color.a = isVisible ? this.cfg.color.a : 0;
    } else if (this.state === "warning") {
      this.visualSize = this.baseVisualSize.copy();
      // Reuse missile blinking logic: 10Hz red blink
      const isRedPhase = ((time * 20) | 0) % 2;
      if (isRedPhase) this.color.set(1, 0, 0);
      else this.color.set(this.cfg.color.r, this.cfg.color.g, this.cfg.color.b);
    } else {
      this.visualSize = this.baseVisualSize.copy();
      this.color.set(
        this.cfg.color.r,
        this.cfg.color.g,
        this.cfg.color.b,
        this.cfg.color.a,
      );
    }
  }

  updateDive() {
    this.color = rgb(1, 0, 0);
    // Relative downward movement
    // To make it feel independent of boss horizontal movement, we'd need to adjust localPos
    // based on boss movement. A simpler way: dive fast enough that it doesn't matter,
    // or just calculate world pos.
    // Since it's a child, worldPos = parent.pos + localPos.rotate(parent.angle)
    // We want worldX to stay diveX, and worldY to decrease.

    const worldY = this.pos.y - this.cfg.diveSpeed;
    const worldPos = vec2(this.diveX, worldY);

    if (this.parent) {
      this.localPos = worldPos
        .subtract(this.parent.pos)
        .rotate(-this.parent.angle);
    } else {
      this.pos = worldPos;
    }

    // If far below player or off screen, transition to returning state
    if (this.pos.y < -5) {
      this.state = "returning";
    }
  }

  updateReturn() {
    // Calculate the target position
    let toTarget;
    const speed = this.cfg.diveSpeed * 0.8; // fly back up slightly slower

    if (this.parent) {
      const targetLocalPos = vec2(
        Math.cos(this.angleOffset),
        Math.sin(this.angleOffset),
      ).scale(this.cfg.radius);
      toTarget = targetLocalPos.subtract(this.localPos);

      if (toTarget.length() <= speed) {
        this.localPos = targetLocalPos;
        this.state = "orbiting";
        this.resetDiveTimer();
      } else {
        this.localPos = this.localPos.add(toTarget.normalize().scale(speed));
      }
    } else {
      toTarget = this.spawnPos.subtract(this.pos);

      if (toTarget.length() <= speed) {
        this.pos = this.spawnPos.copy();
        this.state = "orbiting";
        this.resetDiveTimer();
      } else {
        this.pos = this.pos.add(toTarget.normalize().scale(speed));
      }
    }

    if (this.state === "orbiting") {
      this.color.set(
        this.cfg.color.r,
        this.cfg.color.g,
        this.cfg.color.b,
        this.cfg.color.a,
      );
    } else {
      // Render semi-transparent while retreating
      this.color.set(0.7, 0.7, 0.7, 0.4);
    }
  }

  resetDiveTimer() {
    const actualDiveRate = this.cfg.diveRate || 600;
    this.diveTimer.set(rand(actualDiveRate * 0.8, actualDiveRate * 1.2) / 60);
  }

  collideWithObject(other) {
    if (this.state === "appearing") return false;

    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 0), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.2, 0.1));
      if (this.hp <= 0) {
        addScoreAt(
          this.pos,
          this.hasLoot ? SCORE.orbiterLoot : SCORE.orbiter,
        );
        this.destroy();
      }
      return false;
    }
    return false;
  }

  render() {
    if (this.parent && !this.parent.destroyed) {
      // Tether from orbiter to boss center; renderOrder=-1 keeps it behind the boss sprite.
      this.tetherColor.set(
        this.color.r,
        this.color.g,
        this.color.b,
        this.color.a * 0.5,
      );
      drawLine(this.pos, this.parent.pos, 0.05, this.tetherColor);
    }
    super.render();
  }
}
