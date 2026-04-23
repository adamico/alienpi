import { vec2, rand, Timer, Color, engineObjects } from "../engine.js";
import { enemy as enemyCfg, system, player as playerCfg } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { Loot } from "./loot.js";
import { Boss } from "./boss.js";
import { soundExplosion1 } from "../sounds.js";
import * as gameEffects from "../gameEffects.js";

export class Pinata extends BaseEntity {
  constructor(pos, stage = 0) {
    const cfg = enemyCfg.swarm.pinata;
    super(pos, cfg.sprite, cfg.sheet, cfg.hitboxScale, cfg.size);

    this.hp = cfg.hp * (1 + stage * 0.5);
    this.moveSpeed = cfg.moveSpeed * (1 + stage * 0.1);
    this.state = "WAITING";
    this.moveTimer = new Timer(1);
    this.targetPos = pos.copy();
    this.color = new Color(1, 1, 1); // No flash config for now, just white

    this.setCollision(true);
    this.mass = 1;
    this.damping = 0.95;
    this.isEnemy = true;
    this.mirrorY = cfg.mirrorY;
  }

  update() {
    if (this.state === "WAITING") {
      this.velocity = this.velocity.scale(0.8);
      if (this.moveTimer.elapsed()) {
        const margin = 2;
        const bottomMargin = 10;
        const boss = engineObjects.find(
          (o) => o instanceof Boss && !o.destroyed,
        );
        const minBossDist = 10; // boss radius(3) + safe margin

        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 10) {
          this.targetPos = vec2(
            rand(margin, system.levelSize.x - margin),
            rand(bottomMargin, system.levelSize.y - margin),
          );
          attempts++;

          if (boss) {
            if (this.targetPos.distance(boss.pos) > minBossDist) {
              valid = true;
            }
          } else {
            valid = true;
          }
        }
        this.state = "DASHING";
      }
    } else if (this.state === "DASHING") {
      const toTarget = this.targetPos.subtract(this.pos);
      if (toTarget.length() < 0.5) {
        this.state = "WAITING";
        this.moveTimer.set(2);
      } else {
        this.velocity = toTarget.normalize().scale(this.moveSpeed);
      }
    }

    super.update();
  }

  collideWithObject(other) {
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      if (result === "destroy") other.destroy();

      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 0), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.15, 0.1));
      this.applyEffect(new gameEffects.KnockbackEffect(other.velocity, 0.1));
      if (this.hp <= 0) {
        soundExplosion1.play();
        this.destroy();
      }
      return false;
    }
    return false;
  }

  destroy() {
    if (this.destroyed) return;

    // Spawn loot
    const lootKeys =
      playerCfg.weaponSystem.mode === "ACTIVE"
        ? ["star"]
        : ["blue", "green", "red", "star"];
    const key = lootKeys[Math.floor(rand(lootKeys.length))];
    new Loot(this.pos.copy(), key);

    super.destroy();
  }
}
