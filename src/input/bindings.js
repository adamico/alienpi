import {
  keyIsDown,
  keyWasPressed,
  gamepadIsDown,
  gamepadWasPressed,
} from "../engine.js";
import { settings } from "../config/index.js";
import { saveSettings } from "../persistence.js";

/**
 * Single source of truth for input bindings. Each Action has at most one
 * keyboard code and one gamepad button index. Movement and menu navigation
 * are deliberately fixed (WASD/arrows/stick/D-Pad) and do NOT live here.
 *
 * Per-weapon fire / switch step IDs (fireVulcan, fireShotgun, fireLatch,
 * switchShotgun, switchLatch) collapse onto the shared "fire" / "switchWeapon"
 * actions — game logic only ever asks "is fire down?", never "is fireShotgun
 * down?". Tutorial step IDs map back through TUTORIAL_STEP_TO_ACTION when an
 * icon needs to be drawn for a step.
 */
export const DEFAULT_BINDINGS = {
  fire: { kbd: "Space", pad: 0 },
  focus: { kbd: "ShiftLeft", pad: 6 },
  switchWeapon: { kbd: "KeyQ", pad: 5 },
  confirm: { kbd: "Enter", pad: 0 },
  cancel: { kbd: "Escape", pad: 1 },
  pause: { kbd: "KeyP", pad: 11 },
  skip: { kbd: "Enter", pad: 0 },
  next: { kbd: "Enter", pad: 0 },
  fullScreen: { kbd: "KeyF", pad: 10 },
};

export const REMAPPABLE_ACTIONS = Object.keys(DEFAULT_BINDINGS);

/**
 * Actions that have bindings but are NEVER user-editable (M6). They stay at
 * their defaults so the player cannot softlock themselves out of the menus,
 * and other actions cannot steal their bindings via conflict resolution.
 */
export const LOCKED_ACTIONS = new Set(["confirm", "cancel", "skip", "next"]);

export const TUTORIAL_STEP_TO_ACTION = {
  fireVulcan: "fire",
  fireShotgun: "fire",
  fireLatch: "fire",
  switchShotgun: "switchWeapon",
  switchLatch: "switchWeapon",
  cyclePowerup: "fire",
};

function cloneDefaults() {
  const out = {};
  for (const action of REMAPPABLE_ACTIONS) {
    out[action] = { ...DEFAULT_BINDINGS[action] };
  }
  return out;
}

/** Live mutable bindings — read by every input call site. */
export const bindings = cloneDefaults();

/** Pull bindings from the persisted `settings.bindings` field, if present. */
export function loadBindingsFromSettings() {
  const stored = settings.bindings;
  if (!stored || typeof stored !== "object") return;
  for (const action of REMAPPABLE_ACTIONS) {
    if (LOCKED_ACTIONS.has(action)) continue;
    if (stored[action] && typeof stored[action] === "object") {
      bindings[action] = {
        kbd:
          "kbd" in stored[action]
            ? stored[action].kbd
            : DEFAULT_BINDINGS[action].kbd,
        pad:
          "pad" in stored[action]
            ? stored[action].pad
            : DEFAULT_BINDINGS[action].pad,
      };
    }
  }
}

function snapshotBindings() {
  const snap = {};
  for (const action of REMAPPABLE_ACTIONS) {
    snap[action] = { ...bindings[action] };
  }
  return snap;
}

function persist() {
  settings.bindings = snapshotBindings();
  saveSettings();
}

/**
 * Set a binding, stealing the value from any other action that holds it on
 * the same device (Q8: silent steal, old binding becomes null/unbound).
 *
 * @param {string} action - one of REMAPPABLE_ACTIONS
 * @param {'kbd'|'pad'} device
 * @param {string|number|null} value
 */
export function setBinding(action, device, value) {
  if (!bindings[action]) return;
  if (LOCKED_ACTIONS.has(action)) return;
  if (value !== null && value !== undefined) {
    for (const other of REMAPPABLE_ACTIONS) {
      if (other === action) continue;
      if (LOCKED_ACTIONS.has(other)) continue;
      if (bindings[other][device] === value) {
        bindings[other][device] = null;
      }
    }
  }
  bindings[action][device] = value;
  persist();
}

export function resetBindingsToDefaults() {
  for (const action of REMAPPABLE_ACTIONS) {
    bindings[action] = { ...DEFAULT_BINDINGS[action] };
  }
  persist();
}

export function actionDown(action) {
  const b = bindings[action];
  if (!b) return false;
  if (b.kbd != null && keyIsDown(b.kbd)) return true;
  if (b.pad != null && gamepadIsDown(b.pad)) return true;
  return false;
}

export function actionPressed(action) {
  const b = bindings[action];
  if (!b) return false;
  if (b.kbd != null && keyWasPressed(b.kbd)) return true;
  if (b.pad != null && gamepadWasPressed(b.pad)) return true;
  return false;
}

/** Returns 'keyboard' or 'gamepad' if the action just fired this frame, else null. */
export function actionPressedSource(action) {
  const b = bindings[action];
  if (!b) return null;
  if (b.kbd != null && keyWasPressed(b.kbd)) return "keyboard";
  if (b.pad != null && gamepadWasPressed(b.pad)) return "gamepad";
  return null;
}

export function actionDownSource(action) {
  const b = bindings[action];
  if (!b) return null;
  if (b.kbd != null && keyIsDown(b.kbd)) return "keyboard";
  if (b.pad != null && gamepadIsDown(b.pad)) return "gamepad";
  return null;
}
