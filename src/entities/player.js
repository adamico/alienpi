import {
  vec2,
  keyDirection,
  keyIsDown,
  keyWasPressed,
  Color,
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
  soundPlayerHit,
} from "../sounds.js";
import { Bullet } from "./bullet.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { LatchBeam } from "./latchBeam.js";
import * as gameEffects from "../gameEffects.js";

export let player = null;

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];

export class Player extends BaseEntity {
  constructor(maxHp) {
    super(
      vec2(system.levelSize.x / 2, 1),
      weaponsCfg[WEAPON_ORDER[0]].playerSprite || playerCfg.sprite,
      playerCfg.sheet,
      playerCfg.hitboxScale,
      null,
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

    const latchLocalOffset = this.muzzleLocalOffset(weaponsCfg.latch.nozzle);
    for (const beam of this.latchBeams) this.addChild(beam, latchLocalOffset);
    this.latchSoundTimer = 0;

    // Jet exhaust emitter — parented so the engine syncs its position automatically
    this.exhaustEmitter = new ParticleEmitter(
      this.pos,
      0, // angle
      0.1, // emitSize
      0, // emitTime (0 = loop)
      playerCfg.exhaust.emitRateBase, // emitRate
      0.3, // emitConeAngle
      sprites.get("muzzle_02.png", system.particleSheetName),
      rgb(1, 1, 1), // colorStartA
      rgb(1, 1, 1), // colorStartB
      rgb(1, 0.2, 0, 0), // colorEndA
      rgb(1, 0, 0, 0), // colorEndB
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
    this.addChild(this.exhaustEmitter, vec2(0, -0.7), PI);
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

    if (this.weaponLevels[targetKey] < this.maxLevel) {
      this.weaponLevels[targetKey]++;

      // If we just enabled a weapon that was level 0, or upgraded the current one, refresh visuals
      if (targetKey === this.currentWeaponKey) {
        this.updateWeaponSprite();
      }
    }
  }

  update() {
    this.updateWeaponSwitch();
    this.updateMoving();

    if (this.shootTimer > 0) this.shootTimer--;
    if (this.minShootTimer > 0) this.minShootTimer--;

    this.updateShooting();
    this.updateExhaust();
    super.update();
  }

  updateWeaponSwitch() {
    if (keyWasPressed(system.switchKey)) {
      // Find the next weapon with level > 0
      let nextIndex = this.weaponIndex;
      for (let i = 0; i < WEAPON_ORDER.length; i++) {
        nextIndex = (nextIndex + 1) % WEAPON_ORDER.length;
        if (this.weaponLevels[WEAPON_ORDER[nextIndex]] > 0) {
          this.weaponIndex = nextIndex;
          break;
        }
      }

      this.shootTimer = 0;
      this.updateWeaponSprite();

      // Cycling away from latch breaks any active tethers.
      if (this.currentWeaponKey !== "latch") this.clearLatchBeams();
    }
  }

  updateWeaponSprite() {
    const spriteName = this.currentWeapon.playerSprite;
    if (spriteName) {
      this.sprite = sprites.get(spriteName, playerCfg.sheet);
      if (this.sprite) {
        this.visualSize = this.sprite.size.scale(engine.worldScale);
        this.size = this.visualSize.scale(this.hitboxScale);
      }
    }
  }

  clearLatchBeams() {
    for (const beam of this.latchBeams) beam.clear();
  }

  updateExhaust() {
    if (!this.exhaustEmitter) return;
    const input = keyDirection();
    const { emitRateBase, emitRateRange, sizeStart, sizeStartBoost } =
      playerCfg.exhaust;
    this._exhaustEmitRate = emitRateBase + input.y * emitRateRange;
    this.exhaustEmitter.emitRate = this._exhaustEmitRate;
    this.exhaustEmitter.sizeStart =
      sizeStart + Math.max(0, input.y) * sizeStartBoost;
  }

  render() {
    const blinkHide =
      this.invulnerable &&
      Math.floor(this.invulnerableTimer.get() * 15) % 2 === 0;

    if (blinkHide) {
      if (this.exhaustEmitter) {
        this.exhaustEmitter.emitRate = 0;
        for (const p of this.exhaustEmitter.particles) p.destroy();
      }
      return;
    }

    if (this.exhaustEmitter) {
      this.exhaustEmitter.emitRate =
        this._exhaustEmitRate ?? playerCfg.exhaust.emitRateBase;
    }

    super.render();
  }

  updateMoving() {
    const input = keyDirection();
    if (input.length() > 0) {
      this.velocity = this.velocity.add(
        input.normalize().scale(playerCfg.accel),
      );
    }

    const maxSpeed = keyIsDown(system.focusKey)
      ? engine.objectMaxSpeed * playerCfg.focusSpeedScale
      : engine.objectMaxSpeed;
    if (this.velocity.length() > maxSpeed)
      this.velocity = this.velocity.normalize().scale(maxSpeed);
  }

  updateShooting() {
    const level = this.currentWeaponLevel;
    if (level === 0) return; // Weapon disabled

    const key = this.currentWeaponKey;
    const cfg = weaponsCfg[key];
    const firing = keyIsDown(system.shootKey);

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
  muzzleLocalOffset(pixelOffset) {
    const center = this.visualSize.scale(0.5);
    const muzzleWorld = pixelOffset.scale(engine.worldScale);
    return vec2(muzzleWorld.x - center.x, -(muzzleWorld.y - center.y));
  }

  fireVulcan() {
    const level = this.weaponLevels.vulcan;
    const cfg = weaponsCfg.vulcan;
    const bulletSpeed = cfg.bullet.speed[level - 1];
    soundShoot.play();
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
      gameEffects.spawnMuzzleFlash(this, offset);
    }
  }

  fireShotgun() {
    soundShotgun.play();
    const cfg = weaponsCfg.shotgun;
    const level = this.weaponLevels.shotgun;
    const yInput = keyDirection().y;
    let cone = cfg.coneBase;
    if (yInput > 0) cone = lerp(cfg.coneBase, cfg.coneMax, yInput);
    else if (yInput < 0) cone = lerp(cfg.coneBase, cfg.coneMin, -yInput);

    const nozzleOffset = this.muzzleLocalOffset(cfg.nozzle);
    const spawnPos = this.pos.add(nozzleOffset);
    const speed = cfg.bullet.speed;
    const count = cfg.count[level - 1];
    const damage = cfg.damage[level - 1];

    for (let i = 0; i < count; i++) {
      // Evenly distribute across [-cone/2, +cone/2]
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = -cone / 2 + t * cone;
      // Rotate the base upward velocity by `angle` around Z
      const vel = vec2(Math.sin(angle) * speed, Math.cos(angle) * speed);
      const b = new Bullet(spawnPos.subtract(vel), vel, "player", cfg.bullet, damage);
      b.weaponKey = "shotgun";
      b.pierce = cfg.pierce;
      b.angle = angle; // sprite leans with its direction
    }

    const flashScale = 1 + (count - 1) * 0.1;
    gameEffects.spawnMuzzleFlash(this, nozzleOffset, flashScale);
  }

  updateLatchBeams(firing) {
    const level = this.weaponLevels.latch;
    if (!firing) {
      this.clearLatchBeams();
      this.latchSoundTimer = 0;
      return;
    }
    const cooldown = weaponsCfg.latch.cooldown[level - 1];
    if (this.latchSoundTimer <= 0) {
      soundLatch.play();
      this.latchSoundTimer = cooldown;
    } else {
      this.latchSoundTimer--;
    }
    this.acquireLatchTargets();
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
    this.applyEffect(new gameEffects.FlashEffect(new Color(1, 0, 0), 0.1));
    gameEffects.applyScreenShake(0.3, 0.1);
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
