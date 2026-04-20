import {
  vec2,
  keyDirection,
  keyIsDown,
  Color,
  ParticleEmitter,
  PI,
  rgb,
  time,
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

    // Jet exhaust
    this.exhaustEmitter = new ParticleEmitter(
      this.pos.add(vec2(0, -2)), // pos
      PI, // angle (pointing down)
      0.1, // emitSize
      0, // emitTime (0 = loop forever)
      60, // emitRate
      0, // emitConeAngle
      sprites.get("muzzle_02.png", system.particleSheetName), // tileInfo
      rgb(1, 1, 1), // colorStartA
      rgb(1, 1, 1), // colorStartB
      rgb(1, 0.2, 0, 0), // colorEndA
      rgb(1, 0, 0, 0), // colorEndB
      0.15, // particleTime
      1, // sizeStart
      0.2, // sizeEnd
      0, // speed
      0, // angleSpeed
      0, // damping
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

    // Override the emitter's render to anchor the exhaust at its base (upside down)
    this.exhaustEmitter.render = function () {
      for (const p of this.particles) {
        const originalY = p.pos.y;
        const p1 =
          p.lifeTime > 0 ? Math.min((time - p.spawnTime) / p.lifeTime, 1) : 1;
        const p2 = 1 - p1;
        const dynamicRadius = p2 * p.sizeStart + p1 * p.sizeEnd;

        // Since angle is PI, the original base is rotated to the top of the quad.
        // Shift drawing center DOWN by half of size.
        p.pos.y -= dynamicRadius / 2;
        p.render();
        p.pos.y = originalY; // Restore
      }
    };
  }

  update() {
    this.updateMoving();
    this.updateShooting();

    if (this.exhaustEmitter) {
      // Keep exhaust fixed to the bottom of the ship
      this.exhaustEmitter.pos = this.pos.add(vec2(0, -1.2));

      // Scale emission based on input to create dynamic engine reaction
      const isMoving = keyDirection().length() > 0;
      this.exhaustEmitter.emitRate = isMoving ? 120 : 60;
    }

    super.update();
  }

  destroy() {
    if (this.exhaustEmitter) {
      this.exhaustEmitter.destroy();
      this.exhaustEmitter = null;
    }
    super.destroy();
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

        // Muzzle flash particle
        const emitter = new ParticleEmitter(
          spawnPos.add(vec2(0, -0.3)), // pos tightly attached to the muzzle
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

        // Override the emitter's render to anchor the particle at its base
        emitter.render = function () {
          for (const p of this.particles) {
            const originalY = p.pos.y;
            // The Particle class recalculates its radius internally, so we accurately reproduce it
            // here to push the geometric quad perfectly upwards on every draw frame!
            const p1 =
              p.lifeTime > 0
                ? Math.min((time - p.spawnTime) / p.lifeTime, 1)
                : 1;
            const p2 = 1 - p1;
            const dynamicRadius = p2 * p.sizeStart + p1 * p.sizeEnd;

            p.pos.y += dynamicRadius / 2;
            p.render();
            p.pos.y = originalY; // Restore
          }
        };
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
