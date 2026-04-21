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
  engineObjects,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  system,
  engine,
  player as playerCfg,
  weapons as weaponsCfg,
} from "../config.js";
import { soundShoot } from "../sounds.js";
import { Bullet } from "./bullet.js";
import { Enemy } from "./enemy.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";
import { LatchBeam } from "./latchBeam.js";

export let player = null;

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];

export class Player extends BaseEntity {
  constructor() {
    super(
      vec2(system.levelSize.x / 2, 1),
      playerCfg.sprite,
      playerCfg.sheet,
      playerCfg.hitboxScale,
      null,
      playerCfg.mirrorX,
      playerCfg.mirrorY,
    );

    this.hp = playerCfg.hp;
    this.shootTimer = 0;
    this.setCollision(true, true);
    this.isPlayer = true;
    this.mass = 1;
    this.damping = playerCfg.damping;
    this.weaponIndex = 0;
    this.powerLevel = "max"; // scaffolding for future power tiers
    this.latchBeams = Array.from(
      { length: weaponsCfg.latch.count },
      () => new LatchBeam(),
    );

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

  update() {
    this.updateWeaponSwitch();
    this.updateMoving();
    this.updateShooting();
    this.updateExhaust();
    super.update();
  }

  updateWeaponSwitch() {
    if (keyWasPressed(system.switchKey)) {
      this.weaponIndex = (this.weaponIndex + 1) % WEAPON_ORDER.length;
      this.shootTimer = 0;
      // Cycling away from latch breaks any active tethers.
      if (this.currentWeaponKey !== "latch") this.clearLatchBeams();
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

    if (this.currentWeaponKey === "latch") {
      const origin = this.latchOrigin();
      for (const beam of this.latchBeams) beam.render(origin);
    }
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
    if (this.shootTimer > 0) this.shootTimer--;

    const key = this.currentWeaponKey;
    const firing = keyIsDown(system.shootKey);

    if (key === "latch") {
      this.updateLatchBeams(firing);
      return;
    }

    if (!firing || this.shootTimer > 0) return;

    soundShoot.play();
    if (key === "vulcan") this.fireVulcan();
    else if (key === "shotgun") this.fireShotgun();

    this.shootTimer = this.currentWeapon.cooldown;
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

  spawnMuzzleFlash(offset) {
    const flashEmitter = new ParticleEmitter(
      this.pos,
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
      3.5, // sizeStart
      0.2, // sizeEnd
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
    this.addChild(flashEmitter, offset.add(vec2(0, 1)));
  }

  fireVulcan() {
    const cfg = weaponsCfg.vulcan;
    for (const muzzle of cfg.cannonOffsets) {
      const offset = this.muzzleLocalOffset(muzzle);
      new Bullet(
        this.pos.add(offset),
        vec2(0, cfg.bullet.speed),
        "player",
        cfg.bullet,
      );
      this.spawnMuzzleFlash(offset);
    }
  }

  fireShotgun() {
    const cfg = weaponsCfg.shotgun;
    const yInput = keyDirection().y;
    let cone = cfg.coneBase;
    if (yInput > 0) cone = lerp(cfg.coneBase, cfg.coneMax, yInput);
    else if (yInput < 0) cone = lerp(cfg.coneBase, cfg.coneMin, -yInput);

    const nozzleOffset = this.muzzleLocalOffset(cfg.nozzle);
    const spawnPos = this.pos.add(nozzleOffset);
    const speed = cfg.bullet.speed;

    for (let i = 0; i < cfg.count; i++) {
      // Evenly distribute across [-cone/2, +cone/2]
      const t = cfg.count === 1 ? 0.5 : i / (cfg.count - 1);
      const angle = -cone / 2 + t * cone;
      // Rotate the base upward velocity by `angle` around Z
      const vel = vec2(Math.sin(angle) * speed, Math.cos(angle) * speed);
      const b = new Bullet(spawnPos, vel, "player", cfg.bullet);
      b.pierce = cfg.pierce;
      b.angle = angle; // sprite leans with its direction
    }

    this.spawnMuzzleFlash(nozzleOffset);
  }

  updateLatchBeams(firing) {
    if (!firing) {
      this.clearLatchBeams();
      return;
    }
    this.acquireLatchTargets();
    for (const beam of this.latchBeams) beam.tick();
  }

  /**
   * Assigns up to `count` enemy targets to beams, preferring the nearest.
   * Each beam keeps its current target if it's still alive + in range; idle
   * beams pick the nearest available enemy that no other beam has claimed.
   */
  acquireLatchTargets() {
    const cfg = weaponsCfg.latch;
    const origin = this.latchOrigin();
    const rangeSq = cfg.range * cfg.range;

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

    const claimed = new Set(
      this.latchBeams.map((b) => b.target).filter(Boolean),
    );

    const candidates = [];
    for (const o of engineObjects) {
      if (!o || o.destroyed || claimed.has(o)) continue;
      if (typeof o.hp !== "number" || o.hp <= 0) continue;
      if (!(o instanceof Enemy) && !o.isEnemy) continue;
      // Respect shield invulnerability — matches bullet-vs-boss behaviour.
      if (o.shield && !o.shield.destroyed) continue;
      const dSq = o.pos.distanceSquared(origin);
      if (dSq > rangeSq) continue;
      candidates.push({ o, dSq });
    }
    candidates.sort((a, b) => a.dSq - b.dSq);

    let ci = 0;
    for (const beam of this.latchBeams) {
      if (beam.target) continue;
      if (ci >= candidates.length) break;
      beam.setTarget(candidates[ci++].o);
    }
  }

  latchOrigin() {
    const cfg = weaponsCfg.latch;
    return this.pos.add(this.muzzleLocalOffset(cfg.nozzle));
  }

  takeDamage(amount = 1) {
    if (this.invulnerable || this.destroyed) return false;

    this.hp -= amount;
    this.applyHitEffect({
      flashColor: new Color(1, 0, 0),
      duration: 0.1,
      screenShake: 0.3,
    });
    this.startInvulnerability({ duration: 2 });

    if (this.hp <= 0) location.reload();
    return true;
  }

  collideWithObject(other) {
    if (this.invulnerable) {
      // Still need to collide with boundaries even when invulnerable!
      return !!other.isBoundary;
    }

    if (
      other instanceof Enemy ||
      other.isEnemy ||
      (other instanceof Bullet && other.isEnemy)
    ) {
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

export function spawnPlayer() {
  player = new Player();
  return player;
}
