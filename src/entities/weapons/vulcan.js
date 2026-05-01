import { vec2, rand } from "../../engine.js";
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
  const bulletSpeed = cfg.bullet.speed[level - 1];

  playSfx(soundShoot, ctx.pos);

  const offsets = cfg.cannonOffsets[level - 1];
  const volleyState = { decremented: false };

  // Pass-through on Player keeps activeVulcanBullets in WeaponSystem
  ctx.entity.activeVulcanBullets++;

  for (const muzzle of offsets) {
    const offset = ctx.muzzleLocalOffset(muzzle);
    const jitter = vec2(rand(-cfg.spawnJitterX, cfg.spawnJitterX), 0);
    const velocity = vec2(0, bulletSpeed);

    const b = new Bullet(
      ctx.pos.add(offset).add(jitter).subtract(velocity),
      velocity,
      "player",
      cfg.bullet,
      cfg.damage[level - 1],
    );

    // bullet.js back-ref: needs .pos, .activeVulcanBullets, .weaponLevels,
    // .shootTimer, .updateShooting() — all satisfied by Player pass-throughs.
    b.weaponKey = "vulcan";
    b.player = ctx.entity;
    b.volleyState = volleyState;

    spawnMuzzleFlash(
      ctx.entity,
      offset,
      1,
      -1,
      cfg.muzzleDuration,
      cfg.muzzleAlpha,
      cfg.muzzleSprite,
      cfg.muzzleColor,
    );
  }
}
