import {
  vec2,
  Color,
  WHITE,
  ParticleEmitter,
  PI,
  rgb,
  lerp,
  rand,
  engineObjects,
} from "../engine.js";
import {
  system,
  engine,
  player as playerCfg,
  weapons as weaponsCfg,
} from "../config.js";
import {
  soundShoot,
  soundShotgun,
  soundLatch,
  soundLatchCharge,
  soundPlayerHit,
  soundWeaponSwitch,
  soundWeaponUnlock,
  soundWeaponUpgrade,
  soundWeaponMax,
  weaponNameSounds,
  playSequenced,
} from "../sounds.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { LatchBeam } from "./latchBeam.js";
import { input } from "../input.js";
import {
  FlashEffect,
  spawnMuzzleFlash,
  applyScreenShake,
} from "../gameEffects.js";

export let player = null;

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];

export class Player extends BaseEntity {
  constructor(maxHp) {
    super(
      vec2(system.levelSize.x / 2, 1),
      weaponsCfg[WEAPON_ORDER[0]].playerSprite || playerCfg.sprite,
      playerCfg.sheet,
      playerCfg.hitboxScale,
      playerCfg.size,
      playerCfg.mirrorX,
      playerCfg.mirrorY,
    );

    this.hp = maxHp || playerCfg.hp;
    this.shootTimer = 0;
    this.minShootTimer = 0;
    this.activeVulcanBullets = 0;
    this.setCollision(true, true);
    this.isPlayer = true;
    this.mass = 1;
    this.extraScale = 1;
    this.damping = playerCfg.damping;

    const { startLevels, maxLevel } = playerCfg.weaponSystem;
    this.weaponLevels = { ...startLevels };
    this.maxLevel = maxLevel;

    // Start with the first available (level > 0) weapon index
    this.weaponIndex = WEAPON_ORDER.findIndex(
      (key) => this.weaponLevels[key] > 0,
    );
    if (this.weaponIndex === -1) this.weaponIndex = 0;

    // Pre-allocate max possible latch beams
    const maxLatchBeams = Math.max(...weaponsCfg.latch.count);
    this.latchBeams = Array.from(
      { length: maxLatchBeams },
      () => new LatchBeam(),
    );

    this.updateLatchBeamPositions();
    for (const beam of this.latchBeams) this.addChild(beam);
    this.latchSoundTimer = 0;

    this.exhaustEmitters = [];
    this.updateExhaustEmitters();

    this.muzzleEmitters = [];
    this.updateWeaponSprite();
  }

  get currentWeaponKey() {
    return WEAPON_ORDER[this.weaponIndex];
  }

  get currentWeapon() {
    return weaponsCfg[this.currentWeaponKey];
  }

  get currentWeaponLevel() {
    return this.weaponLevels[this.currentWeaponKey];
  }

  upgradeWeapon(key) {
    // Default to the current weapon if no key is provided (e.g., from a Star loot)
    const targetKey = key || this.currentWeaponKey;
    if (!targetKey || this.weaponLevels[targetKey] === undefined) return;

    const wasLocked = this.weaponLevels[targetKey] === 0;
    if (this.weaponLevels[targetKey] < this.maxLevel) {
      this.weaponLevels[targetKey]++;

      // Play the appropriate feedback sound.
      // All cases say the weapon name first, then the action sting after
      // the name finishes (duration-accurate gap via playSequenced).
      const nameSound = weaponNameSounds[targetKey];
      if (wasLocked) {
        playSequenced(nameSound, soundWeaponUnlock);
      } else if (this.weaponLevels[targetKey] === this.maxLevel) {
        playSequenced(nameSound, soundWeaponMax);
      } else {
        playSequenced(nameSound, soundWeaponUpgrade);
      }

      // If we just enabled a weapon that was level 0, or upgraded the current one, refresh visuals
      if (targetKey === this.currentWeaponKey) {
        this.updateWeaponSprite();
      }
    }
  }

  update() {
    this.extraScale += (1 - this.extraScale) * 0.15;
    this.updateWeaponSwitch();
    this.updateMoving();

    if (this.shootTimer > 0) this.shootTimer--;
    if (this.minShootTimer > 0) this.minShootTimer--;

    this.updateShooting();
    this.updateExhaust();
    super.update();
  }

  updateWeaponSwitch() {
    if (input.switchWeapon) {
      // Find the next weapon with level > 0
      let nextIndex = this.weaponIndex;
      for (let i = 0; i < WEAPON_ORDER.length; i++) {
        nextIndex = (nextIndex + 1) % WEAPON_ORDER.length;
        if (this.weaponLevels[WEAPON_ORDER[nextIndex]] > 0) {
          this.weaponIndex = nextIndex;
          break;
        }
      }

      soundWeaponSwitch.play();
      this.shootTimer = 0;
      this.updateWeaponSprite();

      // Cycling away from latch breaks any active tethers.
      if (this.currentWeaponKey !== "latch") this.clearLatchBeams();

      // Weapon switch animation
      this.extraScale = 1.3;
      this.applyEffect(new FlashEffect(WHITE, 0.15));
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
      const offset = this.muzzleLocalOffset(localOffset);
      const color = cfg.muzzleColor.copy();
      color.a *= cfg.muzzleAlpha;
      const emitter = new ParticleEmitter(
        this.pos,
        0, // angle
        0, // emitSize
        0, // emitTime (0 = loop)
        0, // emitRate (start at 0, only emit when firing)
        0, // emitConeAngle
        sprites.get(cfg.muzzleSprite, system.particleSheetName),
        color,
        color,
        rgb(1, 0.2, 0, 0),
        rgb(1, 0, 0, 0),
        cfg.muzzleDuration, // particleTime
        3.5 * cfg.muzzleSize, // sizeStart
        0.2 * cfg.muzzleSize, // sizeEnd
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
        1, // renderOrder (above ship)
        true, // localSpace
      );
      emitter.baseLocalPos = localOffset.copy();
      this.addChild(emitter, offset);
      this.muzzleEmitters.push(emitter);
    }
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
      const emitter = new ParticleEmitter(
        this.pos,
        0, // angle
        0.1, // emitSize
        0, // emitTime (0 = loop)
        playerCfg.exhaust.emitRateBase, // emitRate
        0.3, // emitConeAngle
        sprites.get("muzzle_02.png", system.particleSheetName),
        colorStart,
        colorStart,
        colorEnd,
        colorEnd,
        0.15, // particleTime
        playerCfg.exhaust.sizeStart, // sizeStart
        0, // sizeEnd
        0.05, // speed
        0, // angleSpeed
        0.8, // damping
        0, // angleDamping
        0, // gravityScale
        0, // particleConeAngle
        0.1, // fadeRate
        0.05, // randomness
        false, // collideTiles
        true, // additive
        true, // randomColorLinear
        -2, // renderOrder
        true, // localSpace
      );
      emitter.baseLocalPos = pixelOffset.copy();
      this.addChild(emitter, worldOffset, PI);
      this.exhaustEmitters.push(emitter);
    }
  }

  clearLatchBeams() {
    for (const beam of this.latchBeams) beam.clear();
  }

  updateExhaust() {
    if (!this.exhaustEmitters) return;
    const moveDir = input.moveDir;
    const { emitRateBase, emitRateRange, sizeStart, sizeStartBoost } =
      playerCfg.exhaust;
    this._exhaustEmitRate = emitRateBase + moveDir.y * emitRateRange;
    this._exhaustSizeStart =
      sizeStart + Math.max(0, moveDir.y) * sizeStartBoost;

    for (const emitter of this.exhaustEmitters) {
      emitter.emitRate = this._exhaustEmitRate;
      emitter.sizeStart = this._exhaustSizeStart;
    }
  }

  render() {
    const blinkHide =
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

  updateShooting() {
    const level = this.currentWeaponLevel;
    if (level === 0) return; // Weapon disabled

    const key = this.currentWeaponKey;
    const cfg = weaponsCfg[key];
    const firing = input.isFiring;

    // Update persistent muzzle muzzles (for Latch)
    if (this.muzzleEmitters.length > 0) {
      for (const e of this.muzzleEmitters) {
        e.emitRate = firing ? cfg.muzzleRate : 0;
      }
    }

    if (key === "latch") {
      this.updateLatchBeams(firing);
      return;
    }

    if (!firing || this.minShootTimer > 0) return;

    if (key === "vulcan") {
      if (this.activeVulcanBullets > 0 || this.shootTimer > 0) return;
      this.fireVulcan();
    } else if (key === "shotgun") {
      if (this.shootTimer > 0) return;
      this.fireShotgun();
      this.shootTimer = cfg.cooldown[level - 1];
    }
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

  fireVulcan() {
    const level = this.weaponLevels.vulcan;
    const cfg = weaponsCfg.vulcan;
    const bulletSpeed = cfg.bullet.speed[level - 1];
    soundShoot.play(this.pos);
    const offsets = cfg.cannonOffsets[level - 1];

    const volleyState = { decremented: false };
    this.activeVulcanBullets++;

    for (const muzzle of offsets) {
      const offset = this.muzzleLocalOffset(muzzle);
      const jitter = vec2(rand(-cfg.spawnJitterX, cfg.spawnJitterX), 0);
      const velocity = vec2(0, bulletSpeed);
      const b = new Bullet(
        this.pos.add(offset).add(jitter).subtract(velocity),
        velocity,
        "player",
        cfg.bullet,
        cfg.damage[level - 1],
      );
      b.weaponKey = "vulcan";
      b.player = this;
      b.volleyState = volleyState;
      spawnMuzzleFlash(
        this,
        offset,
        1,
        -1,
        cfg.muzzleDuration,
        cfg.muzzleAlpha,
        cfg.muzzleSprite,
        cfg.muzzleColor,
      );
    }
  }

  fireShotgun() {
    // 4th arg is per-play random pitch delta — the `randomness` field inside
    // the ZZFX array is baked into the sample at construction so it doesn't
    // vary between shots on its own.
    soundShotgun.play(this.pos);
    const cfg = weaponsCfg.shotgun;
    const level = this.weaponLevels.shotgun;
    const yInput = input.moveDir.y;
    let cone = cfg.coneBase;
    if (yInput > 0) cone = lerp(cfg.coneBase, cfg.coneMax, yInput);
    else if (yInput < 0) cone = lerp(cfg.coneBase, cfg.coneMin, -yInput);

    const muzzles = cfg.muzzleOffsets[level - 1];
    const speed = cfg.bullet.speed;
    const count = cfg.count[level - 1];
    const damage = cfg.damage[level - 1];

    for (const muzzle of muzzles) {
      const offset = this.muzzleLocalOffset(muzzle);
      const spawnPos = this.pos.add(offset);

      for (let i = 0; i < count; i++) {
        // Evenly distribute across [-cone/2, +cone/2]
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = -cone / 2 + t * cone;
        // Rotate the base upward velocity by `angle` around Z
        const vel = vec2(Math.sin(angle) * speed, Math.cos(angle) * speed);
        const b = new Bullet(
          spawnPos.subtract(vel),
          vel,
          "player",
          cfg.bullet,
          damage,
        );
        b.weaponKey = "shotgun";
        b.pierce = cfg.pierce;
        b.angle = angle; // sprite leans with its direction
      }

      const flashScale = 1 + (count - 1) * 0.1;
      spawnMuzzleFlash(
        this,
        offset,
        flashScale,
        1,
        cfg.muzzleDuration,
        cfg.muzzleAlpha,
        cfg.muzzleSprite,
        cfg.muzzleColor,
      );
    }
  }

  updateLatchBeams(firing) {
    const level = this.weaponLevels.latch;
    const cfg = weaponsCfg.latch;
    if (!firing) {
      this.clearLatchBeams();
      this.latchSoundTimer = 0;
      this.latchWasFiring = false;
      return;
    }

    const count = cfg.count[level - 1];
    if (!this.latchWasFiring) {
      soundLatchCharge.play();
      this.latchWasFiring = true;
    }
    if (this.latchSoundTimer <= 0) {
      soundLatch.play();
      // Decoupled from cfg.cooldown (damage tick rate). Sized so the long
      // release tail overlaps into a continuous hum instead of pulsing.
      this.latchSoundTimer = 36;
    } else {
      this.latchSoundTimer--;
    }

    this.acquireLatchTargets();

    // Check if we have any active connections
    const anyTarget = this.latchBeams.some((b) => b.target);

    // Fixed fan distribution
    const cone = cfg.fanCone;
    for (let i = 0; i < count; i++) {
      const beam = this.latchBeams[i];
      // If any beam is connected, only show those with targets.
      // If none are connected, show all in a fan pattern.
      beam.isFiring = !anyTarget || !!beam.target;

      const t = count === 1 ? 0.5 : i / (count - 1);
      beam.fanAngle = -cone / 2 + t * cone;
    }

    this.assignLatchEndOffsets(this.pos);
  }

  /**
   * When multiple beams share a target, spread their endpoints across the
   * target along the axis perpendicular to the beam direction so each beam
   * visually terminates at a distinct point. Spread magnitude scales with
   * `target.size.x` so it naturally matches small vs large enemies.
   */
  assignLatchEndOffsets(origin) {
    const groups = new Map();
    for (const beam of this.latchBeams) {
      beam.endOffset = null;
      if (!beam.target) continue;
      const list = groups.get(beam.target);
      if (list) list.push(beam);
      else groups.set(beam.target, [beam]);
    }

    for (const [target, beams] of groups) {
      const n = beams.length;
      if (n === 1) continue; // no offset needed

      const dir = target.pos.subtract(origin);
      const len = dir.length();
      if (len < 0.001) continue;
      const perp = vec2(-dir.y / len, dir.x / len);

      const span = target.size.x * 0.4; // spread across 60% of target width
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5; // evenly spaced in [-0.5, +0.5]
        beams[i].endOffset = perp.scale(t * span);
      }
    }
  }

  /**
   * Assigns up to `count` enemy targets to beams, preferring the nearest.
   * Each beam keeps its current target if it's still alive + in range; idle
   * beams pick the nearest available enemy that no other beam has claimed.
   */
  acquireLatchTargets() {
    const cfg = weaponsCfg.latch;
    const level = this.weaponLevels.latch;
    const count = cfg.count[level - 1];
    const range = cfg.range[level - 1];
    const origin = this.pos;
    const rangeSq = range * range;

    // Drop targets that are gone, shielded, or out of range so the slot can
    // pick another.
    for (const beam of this.latchBeams) {
      const t = beam.target;
      if (!t || t.destroyed || t.hp <= 0) {
        beam.target = null;
      } else if (t.shield && !t.shield.destroyed) {
        beam.target = null;
      } else if (t.pos.distanceSquared(origin) > rangeSq) {
        beam.target = null;
      }
    }

    const candidates = [];
    for (const o of engineObjects) {
      if (!o || o.destroyed) continue;
      if (typeof o.hp !== "number" || o.hp <= 0) continue;
      if (!o.isEnemy) continue;
      // Respect shield invulnerability — matches bullet-vs-boss behaviour.
      if (o.shield && !o.shield.destroyed) continue;
      const dSq = o.pos.distanceSquared(origin);
      if (dSq > rangeSq) continue;
      candidates.push({ o, dSq });
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => a.dSq - b.dSq);

    // Pass 1: try to give each idle beam a unique target (closest first).
    // We only use up to `count` beams.
    const used = new Set(this.latchBeams.map((b) => b.target).filter(Boolean));
    let ci = 0;
    for (let i = 0; i < count; i++) {
      const beam = this.latchBeams[i];
      if (beam.target) continue;
      while (ci < candidates.length && used.has(candidates[ci].o)) ci++;
      if (ci >= candidates.length) break;
      beam.setTarget(candidates[ci].o);
      used.add(candidates[ci].o);
      ci++;
    }

    // Ensure unused beams for this level are cleared
    for (let i = count; i < this.latchBeams.length; i++) {
      this.latchBeams[i].clear();
    }
  }

  takeDamage(amount = 1) {
    if (this.invulnerable || this.destroyed) return false;

    soundPlayerHit.play();
    this.hp -= amount;
    this.applyEffect(new FlashEffect(new Color(1, 0, 0), 0.1));
    applyScreenShake(0.3, 0.1);
    this.startInvulnerability({ duration: 2 });

    if (this.hp <= 0) {
      // Game state will handle death
    }
    return true;
  }

  collideWithObject(other) {
    if (this.invulnerable) {
      // Still need to collide with boundaries even when invulnerable!
      return !!other.isBoundary;
    }

    if (other.isEnemy || (other.isBullet && other.isEnemy)) {
      if (this.takeDamage(1, other)) {
        // Only destroy projectile-like objects, not persistent hazards
        if (!other.noDestroyOnImpact) {
          other.destroy();
        }
      }
      return false;
    }
    return true;
  }
}

export function spawnPlayer(maxHp) {
  player = new Player(maxHp);
  return player;
}
