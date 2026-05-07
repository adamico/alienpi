import { vec2, timeReal, rand } from "../engine.js";
import { GAME_STATES, system } from "../config/index.js";
import { player as playerCfg } from "../config/entities/player.js";
import { BossMissile } from "../entities/bossMissile.js";
import { Cycler } from "../entities/cycler.js";
import { input } from "../input/input.js";
import { lockPlayerControls, unlockPlayerControls } from "../input/input.js";
import { getGameState, getPlayer } from "./world.js";

const WEAPON_KEY_TO_INDEX = { vulcan: 0, shotgun: 1, latch: 2 };

const STORAGE_KEY = "alienpi.progress.v1";

const STEPS = [
  { id: "movement", duration: 4.0, movement: "orbit" },
  { id: "focus", duration: 4.0, movement: "orbit", focus: true },
  { id: "fireVulcan", duration: 2.6, movement: "strafe", fire: true },
  { id: "switchShotgun", duration: 1.2, movement: "idle", switchWeapon: true },
  { id: "fireShotgun", duration: 2.6, movement: "strafe", fire: true },
  { id: "switchLatch", duration: 1.2, movement: "idle", switchWeapon: true },
  { id: "fireLatch", duration: 2.8, movement: "hover", fire: true },
  {
    id: "cyclePowerup",
    duration: 6.0,
    movement: "chase",
    fire: "pulse",
    setWeapon: "vulcan",
    spawnCycler: true,
  },
];

// One full revolution covers all directions equally.
const ORBIT_PERIOD = 4.0;

let tutorialCompleted = false;
let sequenceActive = false;
let sequenceStartedAt = 0;
let stepStartedAt = 0;
let stepIndex = 0;
let switchTriggeredThisStep = false;
let tutorialMissiles = [];
let tutorialCycler = null;
let setWeaponAppliedThisStep = false;

const TUTORIAL_MIN_Y = 2.8;
const TUTORIAL_MAX_Y = 7.2;

function saveTutorialProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tutorialCompleted }));
  } catch {
    // Storage write failed (private mode, quota): ignore.
  }
}

function getCurrentStep() {
  return STEPS[stepIndex] ?? null;
}

const FIRE_STEPS = new Set(["fireVulcan", "fireShotgun", "fireLatch"]);

function resetPlayerToSpawn() {
  const p = getPlayer();
  if (!p) return;
  p.pos = vec2(system.levelSize.x / 2, playerCfg.entry.targetY);
  p.velocity = vec2(0, 0);
}

function setStep(nextStepIndex) {
  stepIndex = nextStepIndex;
  stepStartedAt = timeReal;
  switchTriggeredThisStep = false;
  setWeaponAppliedThisStep = false;
  resetPlayerToSpawn();
  destroyTutorialCycler();
  const step = STEPS[nextStepIndex];
  if (step && FIRE_STEPS.has(step.id)) {
    spawnTutorialMissiles(2);
  }
  if (step && step.spawnCycler) {
    spawnTutorialCycler();
  }
}

function destroyTutorialCycler() {
  if (tutorialCycler && !tutorialCycler.destroyed) {
    tutorialCycler.destroy();
  }
  tutorialCycler = null;
}

function nearestTargetX(targets, player) {
  const live = targets.filter((t) => t && !t.destroyed);
  if (live.length === 0 || !player) return null;
  const nearest = live.reduce((a, b) =>
    Math.abs(a.pos.x - player.pos.x) < Math.abs(b.pos.x - player.pos.x) ? a : b,
  );
  return nearest;
}

function getStepMoveDir(step, elapsed, player) {
  switch (step.movement) {
    case "orbit": {
      const angle = (elapsed / ORBIT_PERIOD) * Math.PI * 2;
      let x = Math.cos(angle);
      if (step.id === "movement" && x < 0) {
        x *= 0.2;
      }
      return vec2(x, Math.sin(angle));
    }
    case "strafe":
    case "hover": {
      const nearest = nearestTargetX(tutorialMissiles, player);
      if (!nearest) return vec2(0, 0);
      const dx = nearest.pos.x - player.pos.x;
      const x = Math.max(-1, Math.min(1, dx * 0.8));
      return vec2(x, 0);
    }
    case "chase": {
      if (!tutorialCycler || tutorialCycler.destroyed || !player) {
        return vec2(0, 0);
      }
      const dx = tutorialCycler.pos.x - player.pos.x;
      const dy = tutorialCycler.pos.y - player.pos.y;
      const x = Math.max(-1, Math.min(1, dx * 0.8));
      const y = Math.max(-1, Math.min(1, dy * 0.8));
      return vec2(x, y);
    }
    default:
      return vec2(0, 0);
  }
}

function spawnTutorialCycler() {
  destroyTutorialCycler();
  const midX = system.levelSize.x / 2;
  const topY = system.levelSize.y - 5;
  tutorialCycler = new Cycler(vec2(midX, topY));
}

function spawnTutorialMissiles(count = 2) {
  tutorialMissiles = [];
  const topY = system.levelSize.y - 7;
  const midX = system.levelSize.x / 2;
  for (let i = 0; i < count; i++) {
    const x = midX + rand(-system.levelSize.x * 0.3, system.levelSize.x * 0.3);
    const m = new BossMissile(vec2(x, topY), vec2(0, 0), 10, 0);
    m.angle = -Math.PI / 2; // face downward
    tutorialMissiles.push(m);
  }
}

export function loadTutorialProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      tutorialCompleted = false;
      return;
    }
    const parsed = JSON.parse(raw);
    tutorialCompleted = !!parsed.tutorialCompleted;
  } catch {
    tutorialCompleted = false;
  }
}

export function isTutorialPending() {
  return !tutorialCompleted;
}

export function markTutorialCompleted() {
  tutorialCompleted = true;
  saveTutorialProgress();
}

export function resetTutorialProgress() {
  tutorialCompleted = false;
  stopTutorialSequence();
  saveTutorialProgress();
}

export function startTutorialSequence() {
  sequenceActive = true;
  sequenceStartedAt = timeReal;
  lockPlayerControls();
  setStep(0);
}

export function stopTutorialSequence() {
  sequenceActive = false;
  sequenceStartedAt = 0;
  stepStartedAt = 0;
  stepIndex = 0;
  switchTriggeredThisStep = false;
  setWeaponAppliedThisStep = false;
  tutorialMissiles = [];
  destroyTutorialCycler();
  unlockPlayerControls();
}

export function updateTutorialSequence() {
  if (!sequenceActive) return false;

  const step = getCurrentStep();
  if (!step) {
    sequenceActive = false;
    return true;
  }

  const elapsed = timeReal - stepStartedAt;
  const cyclerCollected =
    step.spawnCycler && tutorialCycler && tutorialCycler.destroyed;
  if (elapsed >= step.duration || cyclerCollected) {
    setStep(stepIndex + 1);
    if (!getCurrentStep()) {
      sequenceActive = false;
      return true;
    }
  }

  return false;
}

export function advanceTutorialStep() {
  if (!sequenceActive) return false;
  const nextIdx = stepIndex + 1;
  if (!STEPS[nextIdx]) {
    sequenceActive = false;
    return true;
  }
  setStep(nextIdx);
  return false;
}

export function getTutorialStepState() {
  const step = getCurrentStep();
  if (!sequenceActive || !step) {
    return {
      active: false,
      completed: tutorialCompleted,
      stepId: null,
      stepIndex: 0,
      totalSteps: STEPS.length,
      stepProgress: 0,
      elapsed: 0,
    };
  }

  const elapsed = timeReal - stepStartedAt;
  return {
    active: true,
    completed: tutorialCompleted,
    stepId: step.id,
    stepIndex: stepIndex + 1,
    totalSteps: STEPS.length,
    stepProgress: Math.min(elapsed / step.duration, 1),
    elapsed,
    totalElapsed: timeReal - sequenceStartedAt,
  };
}

export function applyTutorialInput() {
  if (!sequenceActive) return;
  if (getGameState() !== GAME_STATES.TUTORIAL) return;

  const step = getCurrentStep();
  if (!step) return;

  const elapsed = timeReal - stepStartedAt;
  const player = getPlayer();
  const moveDir = getStepMoveDir(step, elapsed, player);

  if (player) {
    if (player.pos.y > TUTORIAL_MAX_Y) {
      moveDir.y = Math.min(moveDir.y, -0.35);
    } else if (player.pos.y < TUTORIAL_MIN_Y) {
      moveDir.y = Math.max(moveDir.y, 0.35);
    }
  }

  input.moveDir = moveDir;

  if (step.focus) input.isFocusing = true;
  if (step.fire === "pulse") {
    // Duty cycle: brief tap then idle, paced just over the cycler's
    // cycleCooldownSeconds (0.5s) so each shot lands a clean cycle without
    // the next bullet stacking knockback and shoving the cycler off-screen.
    const PULSE_PERIOD = 0.7;
    const PULSE_ON = 0.12;
    if (elapsed % PULSE_PERIOD < PULSE_ON) input.isFiring = true;
  } else if (step.fire) {
    input.isFiring = true;
  }

  if (step.switchWeapon && !switchTriggeredThisStep) {
    input.switchWeapon = true;
    switchTriggeredThisStep = true;
  }

  if (step.setWeapon && !setWeaponAppliedThisStep) {
    const idx = WEAPON_KEY_TO_INDEX[step.setWeapon];
    if (player?.weapons && idx != null && player.weapons.weaponIndex !== idx) {
      player.weapons.weaponIndex = idx;
      if (typeof player.onWeaponChanged === "function") {
        player.onWeaponChanged();
      }
      if (Array.isArray(player.latchBeams)) {
        for (const beam of player.latchBeams) beam.clear();
      }
    }
    setWeaponAppliedThisStep = true;
  }
}
