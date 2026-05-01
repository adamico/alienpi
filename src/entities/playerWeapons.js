import { WHITE, vec2, rgb } from "../engine.js";
import { player as playerCfg, weapons as weaponsCfg } from "../config/index.js";
import {
  soundWeaponSwitch,
  soundWeaponUnlock,
  soundWeaponUpgrade,
  soundWeaponMax,
  weaponNameSounds,
} from "../audio/sounds.js";
import { playSequenced, playSfx } from "../audio/soundManager.js";
import { spawnFloatingText, FlashEffect } from "../visuals/gameEffects.js";
import { input } from "../input/input.js";
import { fireVulcan } from "./weapons/vulcan.js";
import { fireShotgun } from "./weapons/shotgun.js";
import { updateLatch, clearLatchBeams } from "./weapons/latch.js";

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];

export class WeaponSystem {
  constructor(player) {
    this.player = player;

    const { startLevels, maxLevel } = playerCfg.weaponSystem;
    this.weaponLevels = { ...startLevels };
    this.maxLevel = maxLevel;

    this.weaponIndex = WEAPON_ORDER.findIndex(
      (key) => this.weaponLevels[key] > 0,
    );
    if (this.weaponIndex === -1) this.weaponIndex = 0;

    this.shootTimer = 0;
    this.minShootTimer = 0;
    this.activeVulcanBullets = 0;

    this.latchState = { soundTimer: 0, wasFiring: false };
  }

  get currentWeaponKey() {
    return WEAPON_ORDER[this.weaponIndex];
  }

  get currentWeapon() {
    return weaponsCfg[this.currentWeaponKey];
  }

  get currentWeaponLevel() {
    return this.weaponLevels[this.currentWeaponKey];
  }

  update(ctx) {
    if (this.shootTimer > 0) this.shootTimer--;
    if (this.minShootTimer > 0) this.minShootTimer--;

    this.updateWeaponSwitch(ctx);
    this.updateShooting(ctx);
  }

  updateWeaponSwitch(ctx) {
    if (!input.switchWeapon) return;

    let nextIndex = this.weaponIndex;
    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      nextIndex = (nextIndex + 1) % WEAPON_ORDER.length;
      if (this.weaponLevels[WEAPON_ORDER[nextIndex]] > 0) {
        this.weaponIndex = nextIndex;
        break;
      }
    }

    playSfx(soundWeaponSwitch);
    ctx.entity.onWeaponChanged();

    if (this.currentWeaponKey !== "latch") clearLatchBeams(ctx);

    ctx.entity.extraScale = 1.3;
    ctx.entity.applyEffect(new FlashEffect(WHITE, 0.15));
  }

  updateShooting(ctx) {
    const level = this.currentWeaponLevel;
    if (level === 0) return;

    const key = this.currentWeaponKey;
    const cfg = weaponsCfg[key];
    const firing = ctx.isFiring;

    // Latch uses persistent muzzle emitters — update their emit rate here
    // so they glow only while the trigger is held.
    if (ctx.muzzleEmitters.length > 0) {
      for (const e of ctx.muzzleEmitters) {
        e.emitRate = firing ? cfg.muzzleRate : 0;
      }
    }

    if (key === "latch") {
      updateLatch(ctx, this.weaponLevels, this.latchState);
      return;
    }

    if (!firing || this.minShootTimer > 0) return;

    if (key === "vulcan") {
      if (this.activeVulcanBullets > 0 || this.shootTimer > 0) return;
      fireVulcan(ctx, this.weaponLevels);
    } else if (key === "shotgun") {
      if (this.shootTimer > 0) return;
      fireShotgun(ctx, this.weaponLevels);
      this.shootTimer = cfg.cooldown[level - 1];
    }
  }

  upgradeWeapon(key) {
    const targetKey = key || this.currentWeaponKey;
    if (!targetKey || this.weaponLevels[targetKey] === undefined) return;

    const wasLocked = this.weaponLevels[targetKey] === 0;
    if (this.weaponLevels[targetKey] >= this.maxLevel) return;

    this.weaponLevels[targetKey]++;

    const nameSound = weaponNameSounds[targetKey];
    const label = (weaponsCfg[targetKey]?.label ?? targetKey).toUpperCase();
    const floatPos = this.player.pos.add(vec2(0, 1.5));

    if (wasLocked) {
      playSequenced(nameSound, soundWeaponUnlock);
      spawnFloatingText(floatPos, `${label} UNLOCKED!`, {
        color: rgb(0.4, 1, 0.6),
        size: 1.2,
        duration: 1.6,
        rise: 3.0,
      });
    } else if (this.weaponLevels[targetKey] === this.maxLevel) {
      playSequenced(nameSound, soundWeaponMax);
      spawnFloatingText(floatPos, `${label} MAX!`, {
        color: rgb(1, 0.85, 0.3),
        size: 1.4,
        duration: 1.8,
        rise: 3.2,
      });
    } else {
      playSequenced(nameSound, soundWeaponUpgrade);
      spawnFloatingText(floatPos, `${label} UPGRADED!`, {
        color: rgb(0.4, 0.9, 1),
        size: 1.1,
        duration: 1.4,
        rise: 2.6,
      });
    }

    if (targetKey === this.currentWeaponKey) {
      this.player.onWeaponChanged();
    }
  }
}
