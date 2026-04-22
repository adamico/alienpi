import {
  vec2,
  rand,
  Timer,
  Color,
} from "../engine.js";
import { enemy as enemyCfg, system } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { Bullet } from "./bullet.js";
import { Loot } from "./loot.js";
import { soundExplosion1 } from "../sounds.js";

export class Pinata extends BaseEntity {
  constructor(pos) {
    const cfg = enemyCfg.swarm.pinata;
    super(pos, cfg.sprite, cfg.sheet, cfg.hitboxScale, cfg.size);

    this.hp = cfg.hp;
    this.moveSpeed = cfg.moveSpeed;
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
        this.state = "DASHING";
        const margin = 2;
        this.targetPos = vec2(
          rand(margin, system.levelSize.x - margin),
          rand(margin, system.levelSize.y - margin),
        );
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
    if (other instanceof Bullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      if (result === "destroy") other.destroy();

      this.applyHitEffect({
        flashColor: new Color(1, 1, 1),
        duration: 0.05,
      });

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
    const lootKeys = ["blue", "green", "yellow"];
    const key = lootKeys[Math.floor(rand(lootKeys.length))];
    new Loot(this.pos.copy(), key);

    super.destroy();
  }
}
