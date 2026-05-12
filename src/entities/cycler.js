import { vec2, WHITE, rgb, timeReal, engineObjects } from "../engine.js";
import { cycler as cyclerCfg, player as playerCfg } from "../config/index.js";
import { BaseEntity } from "./baseEntity.js";
import { player } from "./player.js";
import {
  soundLootCollect,
  soundCyclerHit,
  soundCyclerCycle,
  soundCyclerLock,
} from "../audio/sounds.js";
import { playSfx } from "../audio/soundManager.js";
import { PulseEffect, spawnFloatingText } from "../visuals/gameEffects.js";
import { drawLootCell } from "../visuals/lootIcon.js";
import { addScore } from "../game/score.js";

export function cyclerSfxFor(result) {
  if (result === "lock") return soundCyclerLock;
  if (result === "cycle") return soundCyclerCycle;
  return soundCyclerHit;
}

/**
 * Powerup Cycler. See docs/adr/0002-powerup-cycler.md.
 *
 * Drifts down the playfield. Each non-piercing-overlap bullet hit (gated by
 * `cycleCooldownSeconds`) advances the armed state index through `pool` in
 * fixed order. After `lockMultiplier × pool.length` cycles the cycler
 * force-snaps to `consolationState` (bonusScore) and stops cycling.
 *
 * Player collision applies the armed state's effect:
 *   - `weapon` kind: upgrades the named weapon. If already at max, falls
 *     back to the score award (pickup never wasted).
 *   - `score` kind: adds `bonusScoreAmount` to run score.
 */
export class Cycler extends BaseEntity {
  constructor(pos) {
    super(pos, null, null, cyclerCfg.hitboxScale, cyclerCfg.size);

    this.visualSize = cyclerCfg.size.copy();
    this.size = this.visualSize.scale(cyclerCfg.hitboxScale);

    this.color = WHITE.copy();
    this.setCollision(true, false); // trigger
    this.mass = 0;
    this.velocity = vec2(0, -cyclerCfg.speed);
    this.mirrorY = cyclerCfg.mirrorY;
    this.explodeOnDestroy = false;
    this.renderOrder = 20;

    this.armedIndex = 0;
    this.cycleCount = 0;
    this.locked = false;
    this._lastCycleAt = -Infinity;
    this._processedBullets = new WeakSet();

    this.applyEffect(new PulseEffect(rgb(1, 1, 1, 0.4), 6));
  }

  get armedKey() {
    if (this.locked) return cyclerCfg.consolationState;
    return cyclerCfg.pool[this.armedIndex];
  }

  get armedState() {
    return cyclerCfg.states[this.armedKey];
  }

  /** Mark this entity so weapon code (latch beam) can identify cyclers. */
  get isCycler() {
    return true;
  }

  /** Knockback push applied on every ballistic hit (vulcan/shotgun). */
  applyBulletKnockback() {
    this.velocity.y = cyclerCfg.knockbackImpulse;
  }

  /**
   * Called when a player bullet/beam tick lands on the cycler.
   * Returns 'lock' | 'cycle' | 'gated' so callers can play the matching sfx.
   */
  onBulletHit() {
    if (this.locked) return "gated";
    if (timeReal - this._lastCycleAt < cyclerCfg.cycleCooldownSeconds)
      return "gated";

    this._lastCycleAt = timeReal;
    this.cycleCount += 1;

    const lockAt = cyclerCfg.lockMultiplier * cyclerCfg.pool.length;
    if (this.cycleCount >= lockAt) {
      // Force-snap to consolation state and freeze.
      const idx = cyclerCfg.pool.indexOf(cyclerCfg.consolationState);
      this.armedIndex = idx >= 0 ? idx : this.armedIndex;
      this.locked = true;
      return "lock";
    }

    this.armedIndex = (this.armedIndex + 1) % cyclerCfg.pool.length;
    return "cycle";
  }

  update() {
    // Bullet hit detection. The engine skips collision callbacks between two
    // non-solid triggers (cycler + bullet are both triggers), so we scan
    // engineObjects manually for any bullet overlap. Each ballistic hit
    // applies a knockback impulse regardless of whether it advances a cycle
    // (cooldown gates the cycle but the kick still feels responsive).
    for (const o of engineObjects) {
      if (!o.isBullet || o.destroyed) continue;
      if (!this.isOverlappingObject(o)) continue;
      if (o.type === "boss") continue;
      if (this._processedBullets.has(o)) continue;
      this._processedBullets.add(o);
      if (o.weaponKey === "shotgun") o.destroy();
      this.applyBulletKnockback();
      const result = this.locked ? "gated" : this.onBulletHit();
      playSfx(cyclerSfxFor(result));
      break;
    }

    // Ease velocity back toward the baseline downward drift after any kick.
    const baselineY = -cyclerCfg.speed;
    this.velocity.y =
      baselineY + (this.velocity.y - baselineY) * cyclerCfg.knockbackDamping;

    if (player && !player.destroyed) {
      if (this.pos.distanceSquared(player.pos) < 1.0) this.collect();
    }
    if (this.pos.y < -2) this.destroy();
    super.update();
  }

  render() {
    const state = this.armedState;
    const alpha = this.color.a;

    const c = state.color.copy();
    c.r *= this.color.r;
    c.g *= this.color.g;
    c.b *= this.color.b;
    c.a *= alpha;

    if (this.additiveColor) {
      c.r = Math.min(1, c.r + this.additiveColor.r * this.additiveColor.a);
      c.g = Math.min(1, c.g + this.additiveColor.g * this.additiveColor.a);
      c.b = Math.min(1, c.b + this.additiveColor.b * this.additiveColor.a);
    }

    drawLootCell(this.pos, this.visualSize, c, state.letter, false);
  }

  collect() {
    playSfx(soundLootCollect);
    this.applyArmedStateEffect();
    this.destroy();
  }

  applyArmedStateEffect() {
    if (!player || player.destroyed) return;
    const state = this.armedState;

    if (state.kind === "weapon") {
      const weaponKey = state.weaponKey;
      const level = player.weaponLevels[weaponKey] ?? 0;
      const maxed = level >= playerCfg.weaponSystem.maxLevel;
      if (maxed) {
        this.awardScore();
      } else {
        player.upgradeWeapon(weaponKey);
      }
      return;
    }

    if (state.kind === "score") {
      this.awardScore();
    }
  }

  awardScore() {
    const amount = cyclerCfg.bonusScoreAmount;
    addScore(amount);
    spawnFloatingText(player.pos.add(vec2(0, 1.5)), `+${amount}`, {
      color: rgb(0.95, 0.85, 0.3),
      size: 1.1,
      duration: 1.2,
      rise: 2.5,
    });
  }

  collideWithObject(other) {
    if (other === player) {
      this.collect();
      return false;
    }
    return false;
  }
}
