import { vec2, engineObjects, Color } from "../engine.js";
import { system, enemy as enemyCfg } from "../config.js";
import { Bullet } from "./bullet.js";
import { player } from "./player.js";
import { BaseEntity } from "./baseEntity.js";
import { soundExplosion1 } from "../sounds.js";
import * as gameEffects from "../gameEffects.js";

export class Enemy extends BaseEntity {
  constructor(pos, typeKey, waveIndex = 0) {
    const cfg = enemyCfg.swarm[typeKey];
    super(
      pos,
      cfg.sprite,
      cfg.sheet,
      cfg.hitboxScale,
      null,
      cfg.mirrorX,
      cfg.mirrorY,
    );

    this.typeKey = typeKey;
    this.cfg = cfg;
    this.hp = cfg.hp;
    this.waveIndex = waveIndex;

    this.setCollision(true);
    this.mass = 1;
    this.damping = 0.95;

    this.fireTimer = 0;
    this.isDiving = false;
    this.isWaveEnemy = true;
    this.isEnemy = true;

    this.path = null;
    this.pathIndex = 0;
  }

  update() {
    this.applyTrajectory();
    this.applyFlocking();
    this.applyBehavior();
    super.update();
  }

  applyTrajectory() {
    if (!this.path || this.pathIndex >= this.path.length) {
      this.velocity = this.velocity.scale(0.9);
      return;
    }

    const target = this.path[this.pathIndex];
    const toTarget = target.subtract(this.pos);
    const dist = toTarget.length();

    if (dist < 0.2) {
      this.pathIndex++;
      return;
    }

    const moveDir = toTarget.normalize();
    const accel = 0.01;
    this.velocity = this.velocity.add(moveDir.scale(accel));

    if (this.velocity.length() > this.cfg.speed) {
      this.velocity = this.velocity.normalize().scale(this.cfg.speed);
    }
  }

  applyFlocking() {
    if (!player || !this.cfg.diving) return;

    let cohesion = vec2(0);
    let separation = vec2(0);
    let alignment = vec2(0);
    let count = 0;

    const others = engineObjects.filter((o) => o.isEnemy && o !== this);

    for (const other of others) {
      const dist = this.pos.distance(other.pos);
      if (dist < 5) {
        cohesion = cohesion.add(other.pos);
        alignment = alignment.add(other.velocity);
        if (dist < 1.5) {
          separation = separation.add(
            this.pos.subtract(other.pos).scale(1 / (dist + 0.1)),
          );
        }
        count++;
      }
    }

    if (count > 0) {
      cohesion = cohesion
        .scale(1 / count)
        .subtract(this.pos)
        .scale(enemyCfg.flocking.cohesion);
      alignment = alignment.scale(1 / count).scale(enemyCfg.flocking.alignment);
      separation = separation.scale(enemyCfg.flocking.separation);

      this.velocity = this.velocity
        .add(cohesion)
        .add(alignment)
        .add(separation);
    }

    // Player attraction
    const toPlayer = player.pos
      .subtract(this.pos)
      .normalize()
      .scale(enemyCfg.flocking.playerAttraction);
    this.velocity = this.velocity.add(toPlayer);

    // Limit speed
    const maxSpeed = this.cfg.speed;
    if (this.velocity.length() > maxSpeed) {
      this.velocity = this.velocity.normalize().scale(maxSpeed);
    }
  }

  applyBehavior() {
    if (!player) return;

    if (this.cfg.stopToFire) {
      const dist = this.pos.distance(player.pos);
      // Distance themselves more
      if (dist < 12) {
        this.velocity = this.pos
          .subtract(player.pos)
          .normalize()
          .scale(this.cfg.speed); // Back away
        this.fireTimer++;
      } else if (dist < 15) {
        this.velocity = this.velocity.scale(0.8); // Hover/Slow down
        this.fireTimer++;
      } else {
        this.fireTimer = 0;
      }

      // Calculate dynamic fire rate for Type 1 (shooters)
      // Starts at 240 (4s) and decreases to 60 (1s) by wave 12
      let fireRate = this.cfg.fireRate;
      if (this.typeKey === "type1") {
        fireRate = Math.max(60, 240 - this.waveIndex * 15);
      }

      if (this.fireTimer >= fireRate) {
        this.fireTimer = 0;
        this.fireBullet();
      }
    }

    if (this.cfg.diving) {
      const dist = this.pos.distance(player.pos);
      if (dist < 8 && !this.isDiving) {
        this.isDiving = true;
        this.velocity = player.pos
          .subtract(this.pos)
          .normalize()
          .scale(this.cfg.speed * 2.5);
      }
    }

    // Level boundaries
    const margin = 0.5;
    this.pos.x = Math.max(
      margin,
      Math.min(system.levelSize.x - margin, this.pos.x),
    );
    // Keep enemies from flying below the player area unless diving
    if (!this.cfg.diving || !this.isDiving) {
      this.pos.y = Math.max(5, this.pos.y); // Don't let them go too low
    }
  }

  fireBullet() {
    const b = new Bullet(this.pos.copy(), vec2(0, -0.3), "enemy");
    b.color = this.color.copy();
  }

  collideWithObject(other) {
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      if (result === "destroy") other.destroy();
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 0), 0.1));

      if (this.hp <= 0) {
        soundExplosion1.play();
        this.destroy();
      }
      return false;
    }
    return false;
  }
}
