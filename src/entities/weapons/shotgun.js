import { vec2, lerp } from "../../engine.js";
import { weapons as weaponsCfg } from "../../config/index.js";
import { soundShotgun } from "../../audio/sounds.js";
import { playSfx } from "../../audio/soundManager.js";
import { Bullet } from "../bullet.js";
import { spawnMuzzleFlash } from "../../visuals/gameEffects.js";
import { input } from "../../input/input.js";

/**
 * Fire a Shotgun burst.
 *
 * @param {object} ctx          WeaponContext provided by Player
 * @param {object} weaponLevels Live reference to the WeaponSystem levels map
 */
export function fireShotgun(ctx, weaponLevels) {
  playSfx(soundShotgun, ctx.pos);

  const cfg = weaponsCfg.shotgun;
  const level = weaponLevels.shotgun;
  const yInput = input.moveDir.y;

  let cone = cfg.coneBase;
  if (yInput > 0) cone = lerp(cfg.coneBase, cfg.coneMax, yInput);
  else if (yInput < 0) cone = lerp(cfg.coneBase, cfg.coneMin, -yInput);

  const muzzles = cfg.muzzleOffsets[level - 1];
  const speed = cfg.bullet.speed;
  const count = cfg.count[level - 1];
  const damage = cfg.damage[level - 1];

  for (const muzzle of muzzles) {
    const offset = ctx.muzzleLocalOffset(muzzle);
    const spawnPos = ctx.pos.add(offset);

    for (let i = 0; i < count; i++) {
      // Evenly distribute across [-cone/2, +cone/2]
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = -cone / 2 + t * cone;
      const vel = vec2(Math.sin(angle) * speed, Math.cos(angle) * speed);

      const b = new Bullet(
        spawnPos.subtract(vel),
        vel,
        "player",
        cfg.bullet,
        damage,
      );
      b.weaponKey = "shotgun";
      b.pierce = cfg.pierce;
      b.angle = angle;
    }

    const flashScale = 1 + (count - 1) * 0.1;
    spawnMuzzleFlash(
      ctx.entity,
      offset,
      flashScale,
      1,
      cfg.muzzleDuration,
      cfg.muzzleAlpha,
      cfg.muzzleSprite,
      cfg.muzzleColor,
    );
  }
}
