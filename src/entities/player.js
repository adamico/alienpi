import {
  vec2,
  keyDirection,
  keyIsDown,
  Color,
  ParticleEmitter,
  PI,
  rgb,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import {
  system,
  engine,
  player as playerCfg,
  bullet as bulletCfg,
} from "../config.js";
import { soundShoot } from "../sounds.js";
import { Bullet } from "./bullet.js";
import { Enemy } from "./enemy.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../sprites.js";

export let player = null;

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

  update() {
    this.updateMoving();
    this.updateShooting();
    this.updateExhaust();
    super.update();
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
    if (this.shootTimer > 0) this.shootTimer--;
    if (!keyIsDown(system.shootKey) || this.shootTimer > 0) return;

    soundShoot.play();
    const center = this.visualSize.scale(0.5);

    for (const muzzle of playerCfg.cannonOffsets) {
      // Convert muzzle from pixel coords (Y-down) to world offset (Y-up)
      const muzzleWorld = muzzle.scale(engine.worldScale);
      const offset = vec2(
        muzzleWorld.x - center.x,
        -(muzzleWorld.y - center.y),
      );

      new Bullet(this.pos.add(offset), vec2(0, bulletCfg.speed), "player");

      // Muzzle flash — short-lived emitter parented at the cannon's local offset
      const flashEmitter = new ParticleEmitter(
        this.pos,
        0, // angle
        0, // emitSize
        0.6, // emitTime
        1, // emitRate
        0, // emitConeAngle
        sprites.get("muzzle_05.png", system.particleSheetName),
        rgb(1, 1, 1), // colorStartA
        rgb(1, 1, 1), // colorStartB
        rgb(1, 0.2, 0, 0), // colorEndA
        rgb(1, 0, 0, 0), // colorEndB
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

    this.shootTimer = playerCfg.shootCooldown;
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
