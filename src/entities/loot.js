import { vec2, WHITE, rgb } from "../engine.js";
import { loot as lootCfg, player as playerCfg } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { player } from "./player.js";
import { soundLootCollect } from "../sounds.js";
import { PulseEffect } from "../gameEffects.js";
import { drawLootCell } from "../lootIcon.js";

export class Loot extends BaseEntity {
  constructor(pos, typeKey) {
    const typeCfg = lootCfg.types[typeKey];
    super(
      pos,
      null, // no sprite
      null, // no sheet
      lootCfg.hitboxScale,
      lootCfg.size,
    );

    // Override BaseEntity's visualSize which defaults to vec2(1) when no sprite is provided
    this.visualSize = lootCfg.size.copy();
    this.size = this.visualSize.scale(lootCfg.hitboxScale);

    this.typeKey = typeKey;
    this.label = typeCfg.label;
    this.color = WHITE.copy();

    this.setCollision(true, false); // Trigger only
    this.mass = 0;
    this.velocity = vec2(0, -lootCfg.speed);
    this.mirrorY = lootCfg.mirrorY;
    this.explodeOnDestroy = false;
    this.renderOrder = 20; // V13: Render on top of explosion particles

    // Add pulsing flash effect
    this.applyEffect(new PulseEffect(rgb(1, 1, 1, 0.4), 6));
  }

  update() {
    // Check collection
    if (player && !player.destroyed) {
      if (this.pos.distanceSquared(player.pos) < 1.0) {
        this.collect();
      }
    }

    // Despawn if off screen
    if (this.pos.y < -2) {
      this.destroy();
    }

    super.update();
  }

  render() {
    const typeCfg = lootCfg.types[this.typeKey];
    const alpha = this.color.a;

    // Base color with entity tint/alpha applied
    const c = typeCfg.color.copy();
    c.r *= this.color.r;
    c.g *= this.color.g;
    c.b *= this.color.b;
    c.a *= alpha;

    if (this.additiveColor) {
      c.r = Math.min(1, c.r + this.additiveColor.r * this.additiveColor.a);
      c.g = Math.min(1, c.g + this.additiveColor.g * this.additiveColor.a);
      c.b = Math.min(1, c.b + this.additiveColor.b * this.additiveColor.a);
    }

    drawLootCell(this.pos, this.visualSize, c, typeCfg.letter, false);
  }

  collect() {
    soundLootCollect.play();
    // Placeholder callback for future effects
    this.onCollect();
    this.destroy();
  }

  onCollect() {
    if (!player || player.destroyed) return;

    if (playerCfg.weaponSystem.mode === "ACTIVE") {
      // In ACTIVE mode, only the star upgrades the active weapon.
      if (this.typeKey === "star") {
        player.upgradeWeapon();
      }
    } else {
      // In INDIVIDUAL mode, specific bolts upgrade specific weapons.
      const mapping = {
        blue: "vulcan",
        green: "latch",
        red: "shotgun",
      };

      if (this.typeKey === "star") {
        // Star acts as a wild card/active upgrade even in individual mode
        player.upgradeWeapon();
      } else {
        const weaponKey = mapping[this.typeKey];
        if (weaponKey) {
          player.upgradeWeapon(weaponKey);
        }
      }
    }
  }

  collideWithObject(other) {
    if (other === player) {
      this.collect();
      return false;
    }
    return false;
  }
}
