import {
  vec2,
  keyDirection,
  gamepadStick,
  mouseIsDown,
  mouseWasPressed,
  mouseWasReleased,
  mousePos,
  uiSystem,
} from "../engine.js";
import { actionDownSource, actionPressedSource } from "./bindings.js";

/**
 * Aggregates Keyboard, Gamepad, and Touch/Mouse input into a unified API.
 */
class InputManager {
  constructor() {
    this.moveDir = vec2(0, 0);
    this.isFiring = false;
    this.isFocusing = false;
    this.switchWeapon = false;
    /** @type {'keyboard'|'gamepad'} Last device that produced meaningful input */
    this.lastInputSource = "keyboard";
    /** When true, all physical device reads are skipped (tutorial scripted control). */
    this.controlsLocked = false;

    // Touch specific: Relative Dragging
    this.touchStartPos = null;
    this.touchActive = false;
    this.touchSensitivity = 1.5; // Adjust for feel
  }

  /**
   * Reset triggers that should only fire once per frame.
   */
  reset() {
    this.moveDir = vec2(0, 0);
    this.isFiring = false;
    this.isFocusing = false;
    this.switchWeapon = false;
  }

  /**
   * Aggregates all input sources.
   */
  update() {
    if (this.controlsLocked) return;
    this.updateKeyboard();
    this.updateGamepad();
    this.updateActions();
    this.updateTouch();
  }

  updateKeyboard() {
    const kDir = keyDirection();
    if (kDir.length() > 0) {
      this.moveDir = this.moveDir.add(kDir.normalize());
      this.lastInputSource = "keyboard";
    }
  }

  updateGamepad() {
    const gStick = gamepadStick(0);
    if (gStick.length() > 0.1) {
      this.moveDir = this.moveDir.add(gStick.normalize());
      this.lastInputSource = "gamepad";
    }
  }

  updateActions() {
    const fireSource = actionDownSource("fire");
    if (fireSource) {
      this.isFiring = true;
      this.lastInputSource = fireSource;
    }
    const focusSource = actionDownSource("focus");
    if (focusSource) {
      this.isFocusing = true;
      this.lastInputSource = focusSource;
    }
    const switchSource = actionPressedSource("switchWeapon");
    if (switchSource) {
      this.switchWeapon = true;
      this.lastInputSource = switchSource;
    }
  }

  updateTouch() {
    // LittleJS routes touch to mouse button 0
    // Ignore touches on UI elements
    if (uiSystem?.hoverObject) {
      this.touchActive = false;
      this.touchStartPos = null;
      return;
    }

    if (mouseWasPressed(0) || mouseWasReleased(0)) {
      this.touchStartPos = mousePos.copy();
      this.touchActive = mouseWasPressed(0) || mouseIsDown(0);
    }

    if (mouseIsDown(0)) {
      if (this.touchStartPos) {
        const delta = mousePos.subtract(this.touchStartPos);
        if (delta.length() > 0.01) {
          // Relative movement: always apply full speed if there's movement
          let touchDir = delta.normalize();
          this.moveDir = this.moveDir.add(touchDir);
        }

        // "Rubber band" or "Sticky" relative follow:
        // Move the start position so it stays within a reasonable distance
        // or matches the ship's movement. For now, full relative follow.
        this.touchStartPos = mousePos.copy();
      }
    } else {
      this.touchActive = false;
      this.touchStartPos = null;
    }

    // Normalize moveDir if multiple inputs are used simultaneously
    if (this.moveDir.length() > 1) {
      this.moveDir = this.moveDir.normalize();
    }
  }
}

export const input = new InputManager();

export function lockPlayerControls() {
  input.controlsLocked = true;
}

export function unlockPlayerControls() {
  input.controlsLocked = false;
}
