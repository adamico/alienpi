import {
  vec2,
  EngineObject,
  drawTile,
  engineObjects,
  Color,
} from "../../node_modules/littlejsengine/dist/littlejs.esm.js";
import { engine, enemy as enemyCfg } from "../config.js";
import { sprites } from "../sprites.js";
import { Bullet } from "./bullet.js";
import { player } from "./player.js";

export class Enemy extends EngineObject {
  constructor(pos, typeKey) {
    const cfg = enemyCfg.swarm[typeKey];
    const tile = sprites.get(cfg.sprite);
    super(pos, tile.size.scale(engine.worldScale));
    
    this.typeKey = typeKey;
    this.cfg = cfg;
    this.sprite = tile;
    this.hp = cfg.hp;
    this.color = cfg.color.copy();
    
    this.setCollision(true);
    this.mass = 1;
    this.damping = 0.95;
    
    this.fireTimer = 0;
    this.isDiving = false;
  }

  update() {
    this.applyFlocking();
    this.applyBehavior();
    super.update();
  }

  applyFlocking() {
    if (!player) return;

    let cohesion = vec2(0);
    let separation = vec2(0);
    let alignment = vec2(0);
    let count = 0;

    const others = engineObjects.filter(o => o instanceof Enemy && o !== this);
    
    for (const other of others) {
      const dist = this.pos.distance(other.pos);
      if (dist < 5) {
        cohesion = cohesion.add(other.pos);
        alignment = alignment.add(other.velocity);
        if (dist < 1.5) {
          separation = separation.add(this.pos.subtract(other.pos).scale(1 / (dist + 0.1)));
        }
        count++;
      }
    }

    if (count > 0) {
      cohesion = cohesion.scale(1 / count).subtract(this.pos).scale(enemyCfg.flocking.cohesion);
      alignment = alignment.scale(1 / count).scale(enemyCfg.flocking.alignment);
      separation = separation.scale(enemyCfg.flocking.separation);
      
      this.velocity = this.velocity.add(cohesion).add(alignment).add(separation);
    }

    // Player attraction
    const toPlayer = player.pos.subtract(this.pos).normalize().scale(enemyCfg.flocking.playerAttraction);
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
      if (dist < 10) {
        this.velocity = this.velocity.scale(0.9); // Slow down
        this.fireTimer++;
        if (this.fireTimer >= this.cfg.fireRate) {
          this.fireTimer = 0;
          this.fireBullet();
        }
      }
    }

    if (this.cfg.diving) {
      const dist = this.pos.distance(player.pos);
      if (dist < 8 && !this.isDiving) {
        this.isDiving = true;
        this.velocity = player.pos.subtract(this.pos).normalize().scale(this.cfg.speed * 2);
      }
    }
  }

  fireBullet() {
    const bulletVel = player.pos.subtract(this.pos).normalize().scale(0.2);
    const b = new Bullet(this.pos.copy(), bulletVel);
    b.color = this.color.copy();
    b.isEnemy = true;
  }

  render() {
    if (this.sprite) {
      drawTile(this.pos, vec2(this.size.x, -this.size.y), this.sprite, this.color);
    }
  }

  collideWithObject(other) {
    if (other instanceof Bullet && !other.isEnemy) {
      this.hp--;
      other.destroy();
      this.color = new Color(1, 1, 1); // Flash white
      setTimeout(() => this.color = this.cfg.color.copy(), 50);
      
      if (this.hp <= 0) {
        this.destroy();
      }
      return false;
    }
    return false;
  }
}