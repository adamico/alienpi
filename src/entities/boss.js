import {
  vec2,
  ParticleEmitter,
  Color,
  rgb,
  rand,
  PI,
  Timer,
} from "../engine.js";
import {
  system,
  boss as bossCfg,
  bossBullet as bossBulletCfg,
  orbiter as orbCfg,
  missile as missileCfg,
  beam as beamCfg,
} from "../config/index.js";
import { BaseEntity } from "./baseEntity.js";
import { sprites } from "../visuals/sprites.js";
import { soundExplosion1 } from "../audio/sounds.js";
import { playSfx } from "../audio/soundManager.js";
import * as gameEffects from "../visuals/gameEffects.js";
import { vibrate } from "../input/gamepad.js";
import { addScoreAt, SCORE } from "../game/score.js";

import { BossOrbiter } from "./bossOrbiter.js";
import { BossMissile } from "./bossMissile.js";
import { BossBeam } from "./bossBeam.js";
import { BossShield } from "./bossShield.js";
import { NovaBullet } from "./novaBullet.js";
/**
 * Boss with dynamic movement, fire emitters, and pulse attacks
 */
export class Boss extends BaseEntity {
  /**
   * @param {import('../../node_modules/littlejsengine/dist/littlejs.esm.js').Vector2} entryPos - In-level destination
   */
  constructor(entryPos) {
    // Spawn well above the visible playfield
    const spawnPos = vec2(entryPos.x, entryPos.y + 14);
    super(
      spawnPos,
      bossCfg.sprite,
      bossCfg.sheet,
      bossCfg.hitboxScale,
      bossCfg.size,
      bossCfg.mirrorX,
      bossCfg.mirrorY,
    );

    this.hp = bossCfg.hp;
    this.maxHp = bossCfg.hp;
    this.color = bossCfg.color.copy();
    this.setCollision(true);
    this.mass = 1;
    this.isEnemy = true;
    this.noDestroyOnImpact = true;

    // Approach the entry position before starting normal movement
    this.state = "entering";
    this.targetPos = entryPos.copy();
    this.moveTimer = 0;
    this.pulseTimer = 0;
    this.vulnerableAttackTimer = 200; // start partially charged
    this.nextAttackIsBeam = false;
    this.thresholds = [0.66, 0.33];

    this.fireEmitters = [];
    this.orbiters = [];
    this.initFireEmitters();
    this.initExhaustEmitters();
    this.workingVec = vec2();
    this.workingVec2 = vec2();

    this.orbiterCount = 1;
    this.regenTimer = new Timer();
    this.regenCycle = 0;

    this.telegraphTimer = new Timer();
    this.telegraphAction = null;
    this.novaLockTimer = new Timer();
  }

  initFireEmitters() {
    for (const offset of bossCfg.fireLocations) {
      const emitter = new ParticleEmitter(
        this.pos,
        0, // angle
        0.2, // emitSize
        0, // emitTime (loop)
        0, // emitRate (starts off, driven by updateVisuals)
        PI, // emitConeAngle
        sprites.get("fire_02.png", system.particleSheetName),
        rgb(1, 0.5, 0), // colorStartA
        rgb(1, 0.2, 0), // colorStartB
        rgb(1, 0.5, 0, 0), // colorEndA
        rgb(1, 0.2, 0, 0), // colorEndB
        0.5, // particleTime
        2, // sizeStart
        0.5, // sizeEnd
        0.05, // speed
        0.05, // angleSpeed
        0.95, // damping
        1, // angleDamping
        1, // gravityScale
        PI, // particleConeAngle
        0.1, // fadeRate
        0.2, // randomness
        false, // collideTiles
        true, // additive
        false, // randomColorLinear
        0, // renderOrder
        true, // localSpace
      );
      this.addChild(emitter, offset);
      this.fireEmitters.push(emitter);
    }
  }

  // The boss hull is a square; we mount two emitters on each of the four
  // sides at fixed positions and angles. Only the side opposite to the
  // dominant velocity axis emits at any given moment (e.g. moving right
  // lights up the LEFT side firing leftward), so the exhaust always reads
  // as thrust pushing the ship in its actual direction of travel.
  initExhaustEmitters() {
    // Positions are anchored to the hull edges. The boss is roughly 8 wu;
    // ±3.4 puts emitters at the visible edge, ±1.5 splits the pair on each
    // side for a clean twin-thruster silhouette.
    const offset = 2.4;
    // LittleJS measures emit angles from the +Y axis (angle=0 → up,
    // angle=PI/2 → right, angle=PI → down, angle=-PI/2 → left).
    const sides = [
      {
        key: "left",
        positions: [vec2(-offset, -offset), vec2(-offset, offset)],
        angle: PI / 2,
      },
      {
        key: "right",
        positions: [vec2(offset, -offset), vec2(offset, offset)],
        angle: -PI / 2,
      },
      {
        key: "top",
        positions: [vec2(-offset, offset), vec2(offset, offset)],
        angle: 0,
      },
      {
        key: "bottom",
        positions: [vec2(-offset, -offset), vec2(offset, -offset)],
        angle: PI,
      },
    ];

    this.exhaustSides = {};
    for (const side of sides) {
      const emitters = side.positions.map((pos) => {
        const emitter = new ParticleEmitter(
          this.pos,
          side.angle,
          0.3, // emitSize
          0, // emitTime (loop)
          0, // emitRate (gated by updateExhaust)
          0.35, // emitConeAngle
          sprites.get("smoke_04.png", system.particleSheetName),
          rgb(1, 0.6, 0.3, 0.9),
          rgb(1, 0.3, 0.1, 0.9),
          rgb(0.3, 0.1, 0.05, 0),
          rgb(0.2, 0.05, 0.02, 0),
          0.6, // particleTime
          1.0, // sizeStart
          2.2, // sizeEnd
          0.18, // speed
          0.05, // angleSpeed
          0.94, // damping
          1, // angleDamping
          0, // gravityScale
          0.35, // particleConeAngle
          0.1, // fadeRate
          0.3, // randomness
          false, // collideTiles
          true, // additive
          false, // randomColorLinear
          -1, // renderOrder (behind boss)
          true, // localSpace — required so emitter.angle drives direction
        );
        this.addChild(emitter, pos, side.angle);
        return emitter;
      });
      this.exhaustSides[side.key] = emitters;
    }
  }

  updateExhaust() {
    if (!this.exhaustSides) return;

    const vx = this.velocity.x;
    const vy = this.velocity.y;
    const minSpeed = 0.01;

    // Pick which side fires based on the dominant velocity axis. The active
    // side is the one *opposite* to motion: moving right (+vx) → LEFT side
    // fires leftward (its mounted angle is PI).
    let activeKey = null;
    let activeSpeed = 0;
    if (Math.abs(vx) >= Math.abs(vy)) {
      if (Math.abs(vx) >= minSpeed) {
        activeKey = vx > 0 ? "left" : "right";
        activeSpeed = Math.abs(vx);
      }
    } else {
      if (Math.abs(vy) >= minSpeed) {
        activeKey = vy > 0 ? "bottom" : "top";
        activeSpeed = Math.abs(vy);
      }
    }

    // Rate scales with the dominant component so faster moves give a
    // stronger plume; 0.05 wu/frame ≈ full output.
    const rate = Math.min(120, activeSpeed * 2400);
    for (const [key, emitters] of Object.entries(this.exhaustSides)) {
      const on = key === activeKey;
      for (const e of emitters) e.emitRate = on ? rate : 0;
    }
  }

  initOrbiters(count) {
    // Determine HP for this cycle (exponential curve)
    const hp = Math.min(
      orbCfg.maxHp,
      orbCfg.baseHp * Math.pow(orbCfg.hpCurve, this.regenCycle),
    );

    // Pick one orbiter to carry loot
    const lootIndex = Math.floor(rand(count));

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * PI * 2;
      const orbiter = new BossOrbiter(angle, hp, i === lootIndex);
      this.addChild(orbiter);
      this.orbiters.push(orbiter);
    }
  }

  get stage() {
    const healthPercent = this.hp / this.maxHp;
    return Math.min(4, Math.floor((1 - healthPercent) * 5));
  }

  update() {
    this.updateMovement();
    if (this.state === "active") {
      this.updateTelegraph();
      this.updateAttacks();
    }
    this.updateVisuals();
    this.updateExhaust();
    super.update();
  }

  updateTelegraph() {
    if (this.telegraphTimer.isSet() && this.telegraphTimer.elapsed()) {
      if (this.telegraphAction) {
        this.telegraphAction();
        this.telegraphAction = null;
      }
      this.telegraphTimer.unset();
    }
  }

  updateMovement() {
    if (this.state === "entering") {
      // Glide toward the entry position; switch to active once arrived
      const toEntry = this.targetPos.subtract(this.pos);
      if (toEntry.length() < 0.5) {
        this.state = "active";
        this.initOrbiters(this.orbiterCount);
        this.moveTimer = 0; // trigger an immediate first random move
      } else {
        const accel = toEntry.normalize(bossCfg.speed * 0.1);
        this.velocity = this.velocity.add(accel);
        this.velocity = this.velocity.scale(0.95);
      }
      return;
    }

    if (this.novaLockTimer.isSet()) {
      if (this.novaLockTimer.elapsed()) this.novaLockTimer.unset();
      else {
        this.velocity = vec2(0);
        return;
      }
    }

    const moveScale = 1 + this.stage * 0.08; // Gradual: 1.0, 1.08, 1.16, 1.24, 1.32

    this.moveTimer -= moveScale;

    const margin = orbCfg.radius + 1.5;
    if (this.moveTimer <= 0) {
      this.targetPos = vec2(
        rand(margin, system.levelSize.x - margin),
        rand(system.levelSize.y - margin - 3, system.levelSize.y - margin),
      );
      this.moveTimer = rand(120, 300);
    }

    const toTarget = this.targetPos.subtract(this.pos);
    if (toTarget.length() > 0.1) {
      const accel = toTarget.normalize(bossCfg.speed * 0.1 * moveScale);
      this.velocity = this.velocity.add(accel);
    }
    this.velocity = this.velocity.scale(0.95);
  }

  updateAttacks() {
    const rateScale = 1 + this.stage * 0.15; // Gradual: 1.0, 1.15, 1.3, 1.45, 1.6
    const activeOrbiters = this.orbiters.filter((o) => !o.destroyed);

    if (activeOrbiters.length > 0) {
      // Spawn shield if it isn't active
      if (!this.shield || this.shield.destroyed) {
        this.shield = new BossShield();
        this.addChild(this.shield);
      }
      // Shield is UP: Only fire nova pulses
      this.updateNovaPulse(rateScale);
      // Ensure regen timer is NOT running while shield is up
      this.regenTimer.unset();
    } else {
      // Destroy shield if it is still active
      if (this.shield && !this.shield.destroyed) {
        this.shield.destroy();
      }

      // Shield is DOWN: Handle regeneration timer
      if (!this.regenTimer.isSet()) {
        const regenTime = Math.max(
          bossCfg.regen.minTime,
          bossCfg.regen.baseTime - this.regenCycle * bossCfg.regen.timeStep,
        );
        this.regenTimer.set(regenTime);
      }

      if (this.regenTimer.elapsed()) {
        this.regenCycle++;
        this.orbiterCount = Math.min(
          bossCfg.regen.maxOrbiters,
          this.orbiterCount + 1,
        );
        this.respawnOrbiters();
        this.regenTimer.unset();
      }

      // Shield is DOWN: Alternate between beams and missiles
      this.updateVulnerableAttacks(rateScale);
    }
  }

  updateNovaPulse(rateScale) {
    if (this.telegraphTimer.isSet()) return;

    this.pulseTimer += rateScale;
    if (this.pulseTimer >= bossCfg.novaRate) {
      this.pulseTimer = 0;
      this.telegraphTimer.set(1.0); // 1 second telegraph
      this.telegraphAction = () => this.novaPulse();
      this.addChild(
        new gameEffects.Shockwave(new Color(1, 0.4, 0, 0.8), 1.0, 2.5),
      );
    }
  }

  updateVulnerableAttacks(rateScale) {
    if (this.telegraphTimer.isSet()) return;

    this.vulnerableAttackTimer += rateScale;
    // Base the alternation rate roughly on the configured beam rate or similar timing (600 = 10s, which is slow for alternation. Let's use 300)
    if (this.vulnerableAttackTimer >= 300) {
      this.vulnerableAttackTimer = 0;
      this.nextAttackIsBeam = !this.nextAttackIsBeam;

      this.telegraphTimer.set(1.5); // Slightly longer telegraph for vulnerable attacks
      if (this.nextAttackIsBeam) {
        this.telegraphAction = () => this.fireBeams();
        this.applyEffect(
          new gameEffects.GatheringChargeEffect(
            new Color(1, 0.7, 0, 0.9),
            1.5,
            8.0,
            48,
          ),
        );
      } else {
        this.telegraphAction = () => this.fireMissiles();
        this.applyEffect(
          new gameEffects.TargetingFrameEffect(
            new Color(1, 0, 0, 0.8),
            1.5,
            6.0,
          ),
        );
      }
    }
  }

  fireBeams() {
    const startAngle = rand(0, PI * 2);
    for (let i = 0; i < beamCfg.count; i++) {
      const initialAngle = (i / beamCfg.count) * PI * 2 + startAngle;
      const beam = new BossBeam();
      this.addChild(beam, vec2(0, 0), initialAngle);
    }
  }

  respawnOrbiters() {
    // Destroy existing orbiters and re-init for a clean "shield phase"
    this.orbiters.forEach((o) => o.destroy());
    this.orbiters = [];
    this.initOrbiters(this.orbiterCount);

    // Visual feedback for shield recharge
    this.applyEffect(new gameEffects.FlashEffect(new Color(0.2, 0.5, 1), 0.5));
  }

  novaPulse() {
    const currentNovaSpeed = this.getNovaBulletSpeed();
    const salveDelayMs =
      bossCfg.novaSalveDelayBySpeed / Math.max(0.001, currentNovaSpeed);
    const salveCount = Math.max(1, Math.floor(bossCfg.novaSalveCount ?? 2));
    const totalSalveWindowMs = Math.max(0, (salveCount - 1) * salveDelayMs);
    this.novaLockTimer.set(totalSalveWindowMs / 1000 + 0.05);

    for (let i = 0; i < salveCount; i++) {
      const delayMs = i * salveDelayMs;
      const stepOffset = i % 2;
      setTimeout(() => {
        if (!this.destroyed) this.fireNovaSalve(stepOffset);
      }, delayMs);
    }
  }

  getNovaBulletSpeed() {
    const speedScale = 1 + this.stage * (bossCfg.novaSpeedScalePerStage ?? 0);
    return bossBulletCfg.speed * speedScale;
  }

  fireMissiles() {
    const stage = this.stage;
    const missileLifetime = missileCfg.lifetime - stage * 0.6;
    const missileSpeed = missileCfg.speed * (1 + stage * 0.12);

    // 4..6 missiles, all launched from the back of the boss in a downward fan.
    const count = 4 + Math.floor(stage * 0.5);
    const kickSpeed = 0.2;
    const fanHalfAngle =
      missileCfg.fanHalfAngleBase + stage * missileCfg.fanHalfAngleStageBonus;
    // Y-up: boss faces -Y (toward player), so its back is +Y. Missiles eject
    // upward and away, then homing curves them back down toward the player.
    const backOffset = vec2(0, 2.5);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = PI / 2 + (t * 2 - 1) * fanHalfAngle;
      const lateral = (t * 2 - 1) * missileCfg.spawnLateralJitter * count;
      const spawnPos = this.pos.add(backOffset).add(vec2(lateral, 0));
      const kick = vec2(Math.cos(angle), Math.sin(angle)).scale(kickSpeed);
      new BossMissile(spawnPos, kick, missileLifetime, missileSpeed);
    }
  }

  fireNovaSalve(stepOffset) {
    const pulseSlots = 48;
    const bulletsPerSalve = 24;
    const novaSpeed = this.getNovaBulletSpeed();
    for (let i = 0; i < bulletsPerSalve; i++) {
      const slot = i * 2 + stepOffset;
      const angle = (slot / pulseSlots) * PI * 2;
      const bulletVel = vec2(Math.cos(angle), Math.sin(angle)).scale(novaSpeed);
      const b = new NovaBullet(this.pos.copy(), bulletVel);
      b.color = rgb(1, 0.4, 0);
      b.applyEffect(new gameEffects.RotationEffect(0.1));
      b.applyEffect(new gameEffects.TrailEffect(5));
    }
  }

  updateVisuals() {
    // Progressively activate fire emitters as hp drops
    const step = this.maxHp / 5;
    for (let i = 0; i < this.fireEmitters.length; i++) {
      const emitter = this.fireEmitters[i];
      if (this.hp < step) emitter.emitRate = 100;
      else if (this.hp < step * 2) emitter.emitRate = i < 3 ? 80 : 0;
      else if (this.hp < step * 3) emitter.emitRate = i < 2 ? 60 : 0;
      else if (this.hp < step * 4) emitter.emitRate = i < 1 ? 40 : 0;
      else emitter.emitRate = 0;
    }
  }

  collideWithObject(other) {
    if (other.isBullet && !other.isEnemy) {
      if (this.destroyed || this.hp <= 0) return false;
      const activeOrbiters = this.orbiters.filter((o) => !o.destroyed);
      if (activeOrbiters.length > 0) {
        this.applyEffect(
          new gameEffects.FlashEffect(new Color(0.2, 0.5, 1), 0.1),
        );
        other.destroy(true);
        return false;
      }

      const result = other.hitTarget(this);
      if (result === "ignore") return false;
      this.hp -= other.damage;
      this.applyEffect(new gameEffects.FlashEffect(new Color(1, 1, 1), 0.1));
      this.applyEffect(new gameEffects.ShakeEffect(0.05, 0.1));
      if (this.hp <= 0) {
        addScoreAt(this.pos, SCORE.boss);
        playSfx(soundExplosion1);
        vibrate(600, 1.0, 1.0);
        this.destroy();
      }
      return false;
    }
    return false;
  }
}
