import { vec2, timeReal, rand } from "../engine.js";
import { GAME_STATES, system } from "../config/index.js";
import { player as playerCfg } from "../config/entities/player.js";
import { BossMissile } from "../entities/bossMissile.js";
import { input } from "../input/input.js";
import { getGameState, getPlayer } from "./world.js";

const STORAGE_KEY = "alienpi.progress.v1";

const STEPS = [
  { id: "movement", duration: 4.0, movement: "orbit" },
  { id: "focus", duration: 4.0, movement: "orbit", focus: true },
  { id: "fireVulcan", duration: 2.6, movement: "strafe", fire: true },
  { id: "switchShotgun", duration: 1.2, movement: "idle", switchWeapon: true },
  { id: "fireShotgun", duration: 2.6, movement: "strafe", fire: true },
  { id: "switchLatch", duration: 1.2, movement: "idle", switchWeapon: true },
  { id: "fireLatch", duration: 2.8, movement: "hover", fire: true },
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
  resetPlayerToSpawn();
  const step = STEPS[nextStepIndex];
  if (step && FIRE_STEPS.has(step.id)) {
    spawnTutorialMissiles(2);
  }
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
      // Track nearest live missile's X position
      const live = tutorialMissiles.filter((m) => !m.destroyed);
      if (live.length > 0 && player) {
        const nearest = live.reduce((a, b) =>
          Math.abs(a.pos.x - player.pos.x) < Math.abs(b.pos.x - player.pos.x)
            ? a
            : b,
        );
        const dx = nearest.pos.x - player.pos.x;
        const x = Math.max(-1, Math.min(1, dx * 0.8));
        return vec2(x, 0);
      }
      return vec2(0, 0);
    }
    default:
      return vec2(0, 0);
  }
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
  setStep(0);
}

export function stopTutorialSequence() {
  sequenceActive = false;
  sequenceStartedAt = 0;
  stepStartedAt = 0;
  stepIndex = 0;
  switchTriggeredThisStep = false;
  tutorialMissiles = [];
}

export function updateTutorialSequence() {
  if (!sequenceActive) return false;

  const step = getCurrentStep();
  if (!step) {
    sequenceActive = false;
    return true;
  }

  const elapsed = timeReal - stepStartedAt;
  if (elapsed >= step.duration) {
    setStep(stepIndex + 1);
    if (!getCurrentStep()) {
      sequenceActive = false;
      return true;
    }
  }

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
  if (step.fire) input.isFiring = true;

  if (step.switchWeapon && !switchTriggeredThisStep) {
    input.switchWeapon = true;
    switchTriggeredThisStep = true;
  }
}
