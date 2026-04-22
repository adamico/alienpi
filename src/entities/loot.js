import { vec2, WHITE } from "../engine.js";
import { loot as lootCfg, player as playerCfg } from "../config.js";
import { BaseEntity } from "./baseEntity.js";
import { player } from "./player.js";

export class Loot extends BaseEntity {
  constructor(pos, typeKey) {
    const typeCfg = lootCfg.types[typeKey];
    super(
      pos,
      typeCfg.sprite,
      lootCfg.sheet,
      lootCfg.hitboxScale,
      lootCfg.size,
    );

    this.typeKey = typeKey;
    this.label = typeCfg.label;
    this.color = WHITE.copy();

    this.setCollision(true, false); // Trigger only
    this.mass = 0;
    this.velocity = vec2(0, -lootCfg.speed);
    this.mirrorY = lootCfg.mirrorY;
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

  collect() {
    console.log(`[LOOT] Collected: ${this.label}`);
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
