import { vec2, rgb } from "../../engine.js";

// Powerup Cycler config (see docs/adr/0002-powerup-cycler.md).
// `pool` is the fixed sequence the Cycler steps through one state per shot.
// Each state has a colour + letter for the in-world tinted-aura render and
// a `kind` discriminator so collection logic can route to the right effect.
export const cycler = {
  hitboxScale: 0.8,
  mirrorY: true,
  size: vec2(1.5, 0.65),
  speed: 0.05,
  cycleCooldownSeconds: 0.5,
  // Bullet knockback feel: ballistic hits halt the cycler's downward drift,
  // kick it upward, then ease back to baseline via per-tick damping.
  knockbackImpulse: 0.10,
  knockbackDamping: 0.85,
  // Lock threshold = lockMultiplier * pool.length. After this many cycles
  // the Cycler force-snaps to the consolation state and stops cycling.
  lockMultiplier: 2,
  consolationState: "bonusSubstrate",
  bonusSubstrateAmount: 500,
  pool: ["vulcan", "shotgun", "beam", "bonusSubstrate"],
  states: {
    vulcan: {
      kind: "weapon",
      weaponKey: "vulcan",
      letter: "V",
      label: "Vulcan",
      color: rgb(0.2, 0.6, 0.8),
    },
    shotgun: {
      kind: "weapon",
      weaponKey: "shotgun",
      letter: "S",
      label: "Shotgun",
      color: rgb(1, 0.2, 0.2),
    },
    beam: {
      kind: "weapon",
      weaponKey: "latch",
      letter: "B",
      label: "Beam",
      color: rgb(0.2, 0.65, 0.25),
    },
    bonusSubstrate: {
      kind: "substrate",
      letter: "$",
      label: "Bonus Substrate",
      color: rgb(0.95, 0.8, 0.25),
    },
  },
};
