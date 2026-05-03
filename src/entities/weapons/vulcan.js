import { vec2 } from "../../engine.js";
import { weapons as weaponsCfg } from "../../config/index.js";
import { soundShoot } from "../../audio/sounds.js";
import { playSfx } from "../../audio/soundManager.js";
import { Bullet } from "../bullet.js";
import { spawnMuzzleFlash } from "../../visuals/gameEffects.js";

/**
 * Fire a Vulcan volley.
 *
 * @param {object} ctx   WeaponContext provided by Player
 * @param {object} weaponLevels  Live reference to the WeaponSystem levels map
 */
export function fireVulcan(ctx, weaponLevels) {
  const level = weaponLevels.vulcan;
  const cfg = weaponsCfg.vulcan;
  const bulletSpeed = cfg.bullet.speed;
  const damage = cfg.damage[level - 1];
  const pierce = cfg.pierce[level - 1];
  const count = cfg.bulletCount[level - 1];

  playSfx(soundShoot, ctx.pos);

  for (let i = 0; i < count; i++) {
    const xOffset = (i - (count - 1) * 0.5) * cfg.muzzleSpacing;
    const offset = ctx.muzzleLocalOffset(vec2(xOffset, cfg.muzzleForwardOffset));
    const velocity = vec2(0, bulletSpeed);

    const b = new Bullet(
      ctx.pos.add(offset).subtract(velocity),
      velocity,
      "player",
      cfg.bullet,
      damage,
    );
    b.weaponKey = "vulcan";
    b.pierce = pierce;
    b.angle = 0;

    spawnMuzzleFlash(
      ctx.entity,
      offset,
      1,
      1,
      cfg.muzzleDuration,
      cfg.muzzleAlpha,
      cfg.muzzleSprite,
      cfg.muzzleColor,
    );
  }
}
