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
      null, // customSize
      playerCfg.mirrorX,
      playerCfg.mirrorY,
    );

    this.hp = playerCfg.hp;
    this.shootTimer = 0;
    this.setCollision(true, true);
    this.isPlayer = true;
    this.mass = 1;
    this.damping = playerCfg.damping;

    // Jet exhaust — parented to the Player via addChild so the engine
    // automatically transforms its world pos from localPos every frame.
    this.exhaustEmitter = new ParticleEmitter(
      this.pos, // initial pos (doesn't matter, overridden by parent transform)
      0, // angle
      0.1, // emitSize
      0, // emitTime (0 = loop forever)
      60, // emitRate
      0.3, // emitConeAngle
      sprites.get("muzzle_02.png", system.particleSheetName), // tileInfo
      rgb(1, 1, 1), // colorStartA
      rgb(1, 1, 1), // colorStartB
      rgb(1, 0.2, 0, 0), // colorEndA
      rgb(1, 0, 0, 0), // colorEndB
      0.15, // particleTime
      1, // sizeStart
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
      true,
    );

    // Attach emitter as a child at the engine's nozzle offset (local space)
    // The engine will call updateTransforms() automatically each frame.
    this.addChild(this.exhaustEmitter, vec2(0, -0.7), PI);
  }

  update() {
    this.updateMoving();
    this.updateShooting();

    // Dynamic emitRate based on movement input
    if (this.exhaustEmitter) {
      const isMoving = keyDirection().length() > 0;
      this.exhaustEmitter.emitRate = isMoving ? 120 : 60;
    }

    super.update();
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
    if (keyIsDown(system.shootKey) && this.shootTimer <= 0) {
      soundShoot.play();
      const visualSize = this.visualSize;
      const center = visualSize.scale(0.5);
      for (const muzzle of playerCfg.cannonOffsets) {
        // muzzle is in pixel coordinates, convert to world units
        const muzzleWorld = muzzle.scale(engine.worldScale);

        // Offset from center in world space (Y-up)
        // Pixels are Y-down, so we negate the Y difference
        const offset = vec2(
          muzzleWorld.x - center.x,
          -(muzzleWorld.y - center.y),
        );

        const spawnPos = this.pos.add(offset);
        new Bullet(spawnPos, vec2(0, bulletCfg.speed), "player");

        // Muzzle flash particle — parented to the player at the cannon offset
        const flashEmitter = new ParticleEmitter(
          this.pos, // initial pos (overridden by parent transform)
          0, // angle
          0, // emitSize
          0.6, // emitTime
          1, // emitRate
          0, // emitConeAngle
          sprites.get("muzzle_05.png", system.particleSheetName), // tileInfo
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

        // Attach to player at the cannon's local offset, rotated PI (pointing up = muzzle direction)
        this.addChild(flashEmitter, offset.add(vec2(0, 1)));
      }
      this.shootTimer = playerCfg.shootCooldown;
    }
  }

  collideWithObject(other) {
    if (this.invulnerable) return;

    if (other instanceof Enemy || (other instanceof Bullet && other.isEnemy)) {
      this.hp--;
      other.destroy();
      this.applyHitEffect({
        flashColor: new Color(1, 0, 0),
        duration: 0.1,
        screenShake: 0.3,
      });

      this.startInvulnerability({ duration: 2 });

      if (this.hp <= 0) {
        // Simple game over: restart
        location.reload();
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
