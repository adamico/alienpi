import {
  vec2,
  engineObjectsCallback,
  EngineObject,
  time,
} from "../engine.js";
import { boss as bossCfg, shield as shieldCfg } from "../config.js";
import { sprites } from "../sprites.js";
import { player } from "./player.js";

/**
 * Invulnerable shield visual and hitbox.
 * Absorbs player bullets and pushes the player ship away.
 */
export class BossShield extends EngineObject {
  constructor() {
    const tileInfo = sprites.get(shieldCfg.sprite, shieldCfg.sheet);
    super(
      vec2(),
      vec2((bossCfg.size.x / 2 + shieldCfg.radiusOffset) * 2),
      tileInfo,
    );

    this.renderOrder = shieldCfg.renderOrder; // Render above boss, below orbiters
    this.baseColor = shieldCfg.baseColor.copy();
    this.color = this.baseColor.copy();
    this.hitColor = shieldCfg.hitColor.copy();

    // Disable standard collision to handle bullets and player manually
    this.setCollision(false, false);
    this.mass = 0;
  }

  update() {
    super.update();
    if (!this.parent) return;

    // Visual pulse
    const scale =
      1 + Math.sin(time * shieldCfg.pulseSpeed) * shieldCfg.pulseMagnitude;
    this.size = vec2((bossCfg.size.x / 2 + shieldCfg.radiusOffset) * 2).scale(
      scale,
    );
    const radius = (this.size.x / 2) * shieldCfg.hitboxScale;

    // Collision sweep
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (o.isBullet && !o.isEnemy) {
        if (o.pos.distanceSquared(this.pos) < radius * radius) {
          o.destroy(true);
          // Hit flash
          this.color.set(
            this.hitColor.r,
            this.hitColor.g,
            this.hitColor.b,
            this.hitColor.a,
          );
        }
      } else if (o === player && !o.destroyed) {
        const diff = o.pos.subtract(this.pos);
        const dist = diff.length();
        const combinedRadius =
          radius + o.size.x * shieldCfg.playerHitRadiusScale;

        if (dist > 0 && dist < combinedRadius) {
          const normal = diff.normalize();
          // Snap player outside
          o.pos = this.pos.add(normal.scale(combinedRadius));
          // Apply outward velocity bounce
          o.velocity = o.velocity.add(normal.scale(shieldCfg.bounceSpeed));
        }
      }
    });

    // Fade color back
    this.color.lerp(this.baseColor, shieldCfg.colorFadeSpeed);
  }
}
