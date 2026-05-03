import { vec2, Color, PI, Timer } from "../engine.js";
import {
  system,
  engine,
  player as playerCfg,
  weapons as weaponsCfg,
} from "../config/index.js";
import { soundPlayerHit } from "../audio/sounds.js";
import { playSfx } from "../audio/soundManager.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../visuals/sprites.js";
import { LatchBeam } from "./latchBeam.js";
import { input } from "../input/input.js";
import {
  FlashEffect,
  createPersistentExhaustEmitter,
  createPersistentMuzzleEmitter,
  applyScreenShake,
} from "../visuals/gameEffects.js";
import { vibrate } from "../input/gamepad.js";
import { recordHpLost } from "../game/economy.js";
import { WeaponSystem } from "./playerWeapons.js";

export let player = null;

export class Player extends BaseEntity {
  constructor(maxHp) {
    super(
      vec2(system.levelSize.x / 2, playerCfg.entry.startY),
      weaponsCfg.vulcan.playerSprite || playerCfg.sprite,
      playerCfg.sheet,
      playerCfg.hitboxScale,
      playerCfg.size,
      playerCfg.mirrorX,
      playerCfg.mirrorY,
    );

    this.hp = maxHp || playerCfg.hp;
    this.setCollision(true, true);
    this.isPlayer = true;
    this.mass = 1;
    this.extraScale = 1;
    this.damping = playerCfg.damping;

    // Pre-allocate max possible latch beams (scene-graph children stay on Player)
    const maxLatchBeams = Math.max(...weaponsCfg.latch.count);
    this.latchBeams = Array.from(
      { length: maxLatchBeams },
      () => new LatchBeam(),
    );

    // WeaponSystem must be created before updateLatchBeamPositions() (which reads weaponLevels)
    this.weapons = new WeaponSystem(this);

    this.updateLatchBeamPositions();
    for (const beam of this.latchBeams) this.addChild(beam);

    this.exhaustEmitters = [];
    this.updateExhaustEmitters();

    this.muzzleEmitters = [];
    this.updateWeaponSprite();

    // Entry animation: ship flies in from below the screen
    this.entryAnimating = true;
    this.entryTimer = new Timer(playerCfg.entry.duration);
    this.startInvulnerability({ duration: playerCfg.entry.duration + 0.5 });
  }

  // --- WeaponSystem pass-throughs ----------------------------------------
  // These delegate to this.weapons so that external callers (bullet.js,
  // loot.js, hudView.js) don't need to know about WeaponSystem.

  get currentWeaponKey() {
    return this.weapons.currentWeaponKey;
  }
  get currentWeapon() {
    return this.weapons.currentWeapon;
  }
  get currentWeaponLevel() {
    return this.weapons.currentWeaponLevel;
  }
  get weaponLevels() {
    return this.weapons.weaponLevels;
  }
  get shootTimer() {
    return this.weapons.shootTimer;
  }
  set shootTimer(v) {
    this.weapons.shootTimer = v;
  }
  get activeShotgunBullets() {
    return this.weapons.activeShotgunBullets;
  }
  set activeShotgunBullets(v) {
    this.weapons.activeShotgunBullets = v;
  }

  upgradeWeapon(key) {
    this.weapons.upgradeWeapon(key);
  }

  /** Called by bullet.js to trigger an immediate fire check after a hit. */
  updateShooting() {
    this.weapons.updateShooting(this.weaponContext);
  }

  /** Called by WeaponSystem when the active weapon changes. */
  onWeaponChanged() {
    this.updateWeaponSprite();
  }

  /**
   * Minimal interface passed into weapon modules so they never import Player.
   * muzzleLocalOffset is intentionally a closure here — weapons get the
   * banking-aware transform without knowing splitScale exists.
   */
  get weaponContext() {
    return {
      pos: this.pos,
      entity: this,
      latchBeams: this.latchBeams,
      muzzleEmitters: this.muzzleEmitters,
      isFiring: input.isFiring,
      muzzleLocalOffset: (o) => this.muzzleLocalOffset(o),
    };
  }
  // -------------------------------------------------------------------------

  update() {
    this.extraScale += (1 - this.extraScale) * 0.15;
    if (this.entryAnimating) {
      this.updateEntryAnimation();
      this.updateExhaust();
      super.update();
      return;
    }
    this.updateMoving();
    this.weapons.update(this.weaponContext);
    this.updateExhaust();
    super.update();
  }

  updateEntryAnimation() {
    const cfg = playerCfg.entry;
    const t = this.entryTimer.getPercent();
    // Cubic ease-out: fast start, smooth deceleration into position
    const eased = 1 - Math.pow(1 - t, 3);
    this.pos.y = cfg.startY + (cfg.targetY - cfg.startY) * eased;
    this.velocity = vec2(0);

    if (this.entryTimer.elapsed()) {
      this.entryAnimating = false;
      this.pos.y = cfg.targetY;
      this.extraScale = 1.15; // Small pop on arrival
    }
  }

  updateWeaponSprite() {
    const spriteName = this.currentWeapon.playerSprite;
    if (spriteName) {
      const sheet = playerCfg.sheet;
      this.sprite = sprites.get(spriteName, sheet);
      if (this.sprite) {
        this.visualSize = playerCfg.size
          ? sprites.getSize(spriteName, sheet, playerCfg.size)
          : this.sprite.size.scale(engine.worldScale);
        this.size = this.visualSize.scale(this.hitboxScale);
        this.baseVisualWidth = this.visualSize.x;
      }
    }
    this.updateExhaustEmitters();
    this.updateMuzzleEmitters();
    this.updateLatchBeamPositions();
  }

  updateMuzzleEmitters() {
    // 1. Clean up old emitters
    if (this.muzzleEmitters) {
      for (const e of this.muzzleEmitters) e.destroy();
    }
    this.muzzleEmitters = [];

    const cfg = this.currentWeapon;
    // Only Latch uses persistent muzzles for now
    if (this.currentWeaponKey !== "latch") return;

    const level = this.weaponLevels.latch;
    const muzzles = cfg.muzzleOffsets[Math.max(1, level) - 1];

    for (const localOffset of muzzles) {
      this.addLatchMuzzleEmitter(localOffset, cfg);
    }
  }

  addLatchMuzzleEmitter(localOffset, cfg) {
    const offset = this.muzzleLocalOffset(localOffset);
    const color = cfg.muzzleColor.copy();
    color.a *= cfg.muzzleAlpha;
    const emitter = createPersistentMuzzleEmitter(this.pos, {
      spriteName: cfg.muzzleSprite,
      color,
      sizeScale: cfg.muzzleSize,
      duration: cfg.muzzleDuration,
      renderOrder: 1,
    });
    emitter.baseLocalPos = localOffset.copy();
    this.addChild(emitter, offset);
    this.muzzleEmitters.push(emitter);
  }

  updateLatchBeamPositions() {
    if (!this.latchBeams) return;
    const cfg = weaponsCfg.latch;
    const level = Math.max(1, this.weaponLevels.latch);
    const muzzles = cfg.muzzleOffsets[level - 1];
    const nBeams = this.latchBeams.length;
    const nMuzzles = muzzles.length;

    for (let i = 0; i < nBeams; i++) {
      const beam = this.latchBeams[i];
      const muzzleIdx = i % nMuzzles;
      const muzzleOffset = muzzles[muzzleIdx];
      const offset = this.muzzleLocalOffset(muzzleOffset);
      // Update local position to the chosen muzzle
      beam.baseLocalPos = muzzleOffset.copy();
      beam.localPos = offset;
    }
  }

  updateExhaustEmitters() {
    // 1. Clean up old emitters
    if (this.exhaustEmitters) {
      for (const e of this.exhaustEmitters) e.destroy();
    }
    this.exhaustEmitters = [];

    const cfg = this.currentWeapon;
    if (!cfg.exhaustOffsets) return;

    const colorStart = cfg.exhaustColor;
    const colorEnd = colorStart.copy();
    colorEnd.a = 0;

    for (const pixelOffset of cfg.exhaustOffsets) {
      const worldOffset = this.muzzleLocalOffset(pixelOffset);
      const emitter = createPersistentExhaustEmitter(this.pos, {
        colorStart,
        colorEnd,
        emitRate: playerCfg.exhaust.emitRateBase,
        sizeStart: playerCfg.exhaust.sizeStart,
        renderOrder: -2,
      });
      emitter.baseLocalPos = pixelOffset.copy();
      this.addChild(emitter, worldOffset, PI);
      this.exhaustEmitters.push(emitter);
    }
  }

  updateExhaust() {
    if (!this.exhaustEmitters) return;
    const { emitRateBase, emitRateRange, sizeStart, sizeStartBoost } =
      playerCfg.exhaust;
    if (this.entryAnimating) {
      // Full thrust during entry fly-in
      this._exhaustEmitRate = emitRateBase + emitRateRange;
      this._exhaustSizeStart = sizeStart + sizeStartBoost;
    } else {
      const moveDir = input.moveDir;
      this._exhaustEmitRate = emitRateBase + moveDir.y * emitRateRange;
      this._exhaustSizeStart =
        sizeStart + Math.max(0, moveDir.y) * sizeStartBoost;
    }

    for (const emitter of this.exhaustEmitters) {
      emitter.emitRate = this._exhaustEmitRate;
      emitter.sizeStart = this._exhaustSizeStart;
    }
  }

  render() {
    const blinkHide =
      !this.entryAnimating &&
      this.invulnerable &&
      Math.floor(this.invulnerableTimer.get() * 15) % 2 === 0;

    if (blinkHide) {
      if (this.exhaustEmitters) {
        for (const e of this.exhaustEmitters) {
          e.emitRate = 0;
          for (const p of e.particles) p.destroy();
        }
      }
      return;
    }

    if (this.exhaustEmitters) {
      for (const e of this.exhaustEmitters) {
        e.emitRate = this._exhaustEmitRate ?? playerCfg.exhaust.emitRateBase;
      }
    }

    const originalSize = this.visualSize.copy();
    this.visualSize = this.visualSize.scale(this.extraScale);
    super.render();
    this.visualSize = originalSize;
  }

  updateMoving() {
    const moveDir = input.moveDir;
    if (moveDir.length() > 0) {
      this.velocity = this.velocity.add(moveDir.scale(playerCfg.accel));
    }

    const maxSpeed = input.isFocusing
      ? engine.objectMaxSpeed * playerCfg.focusSpeedScale
      : engine.objectMaxSpeed;
    if (this.velocity.length() > maxSpeed)
      this.velocity = this.velocity.normalize().scale(maxSpeed);

    // V2: Banking Effect (Split Scaling)
    if (this.baseVisualWidth) {
      this.visualSize.x = this.baseVisualWidth; // Reset global width

      const maxBankVelocity = maxSpeed * 0.8;

      // Calculate shading factor (-1 to 1) to darken the side leaning into the turn
      const shadeFactor = Math.max(
        -1,
        Math.min(1, this.velocity.x / maxBankVelocity),
      );
      this.splitShading = shadeFactor;

      if (!this.splitScale) this.splitScale = { left: 1, right: 1 };

      let targetLeft = 1;
      let targetRight = 1;

      if (shadeFactor < 0) {
        // Moving left: left half squishes (leans away), right half expands (tilts to camera)
        targetLeft = 1 - Math.abs(shadeFactor) * 0.2;
        targetRight = 1 + Math.abs(shadeFactor) * 0.25;
      } else if (shadeFactor > 0) {
        // Moving right: right half squishes (leans away), left half expands (tilts to camera)
        targetLeft = 1 + Math.abs(shadeFactor) * 0.25;
        targetRight = 1 - Math.abs(shadeFactor) * 0.2;
      }

      // Lerp for smooth tipping back and forth
      this.splitScale.left += (targetLeft - this.splitScale.left) * 0.15;
      this.splitScale.right += (targetRight - this.splitScale.right) * 0.15;

      this.updateChildOffsets();
    }
  }

  updateChildOffsets() {
    if (!this.splitScale) return;

    const applyScale = (obj) => {
      if (obj && obj.baseLocalPos) {
        obj.localPos = this.muzzleLocalOffset(obj.baseLocalPos);
      }
    };

    if (this.exhaustEmitters) this.exhaustEmitters.forEach(applyScale);
    if (this.muzzleEmitters) this.muzzleEmitters.forEach(applyScale);
    if (this.latchBeams) this.latchBeams.forEach(applyScale);
  }

  /**
   * Converts a sprite-space (Y-down pixel) offset to the ship's local
   * world-space (Y-up) offset used for parenting muzzle flashes and for
   * computing the world spawn position of bullets.
   */
  muzzleLocalOffset(offset) {
    if (this.splitScale) {
      if (offset.x < 0) return vec2(offset.x * this.splitScale.left, offset.y);
      if (offset.x > 0) return vec2(offset.x * this.splitScale.right, offset.y);
    }
    return offset.copy();
  }

  takeDamage(amount = 1) {
    if (this.invulnerable || this.destroyed) return false;

    playSfx(soundPlayerHit);
    this.hp -= amount;
    recordHpLost(amount);
    this.applyEffect(new FlashEffect(new Color(1, 0, 0), 0.1));
    applyScreenShake(0.3, 0.1);
    vibrate(180, 0.7, 0.9);
    this.startInvulnerability({ duration: 2 });

    if (this.hp <= 0) {
      // Game state will handle death
    }
    return true;
  }

  collideWithObject(other) {
    if (this.entryAnimating) return false; // pass through everything during entry

    if (this.invulnerable) {
      // Still need to collide with boundaries even when invulnerable!
      return !!other.isBoundary || !!other.isBoss;
    }

    if (other.isEnemy || (other.isBullet && other.isEnemy)) {
      if (this.takeDamage(1, other)) {
        // Only destroy projectile-like objects, not persistent hazards
        if (!other.noDestroyOnImpact) {
          other.destroy();
        }
      }
      // Return true for the boss so the physics solver pushes the player away.
      return !!other.isBoss;
    }
    return true;
  }
}

export function spawnPlayer(maxHp) {
  player = new Player(maxHp);
  return player;
}
