import {
  vec2,
  keyDirection,
  keyIsDown,
  keyWasPressed,
  gamepadStick,
  gamepadIsDown,
  gamepadWasPressed,
  mouseIsDown,
  mouseWasPressed,
  mouseWasReleased,
  mousePos,
} from "./engine.js";
import { system } from "./config.js";

/**
 * Aggregates Keyboard, Gamepad, and Touch/Mouse input into a unified API.
 */
class InputManager {
  constructor() {
    this.moveDir = vec2(0, 0);
    this.isFiring = false;
    this.isFocusing = false;
    this.switchWeapon = false;

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
    this.updateKeyboard();
    this.updateGamepad();
    this.updateTouch();
  }

  updateKeyboard() {
    const kDir = keyDirection();
    if (kDir.length() > 0) {
      this.moveDir = this.moveDir.add(kDir.normalize());
    }

    if (keyIsDown(system.shootKey)) this.isFiring = true;
    if (keyIsDown(system.focusKey)) this.isFocusing = true;
    if (keyWasPressed(system.switchKey)) this.switchWeapon = true;
  }

  updateGamepad() {
    const gStick = gamepadStick(0);
    if (gStick.length() > 0.1) {
      // Deadzone
      this.moveDir = this.moveDir.add(gStick);
    }

    // Fire: A (0) or RT (7)
    if (gamepadIsDown(0) || gamepadIsDown(7)) this.isFiring = true;
    // Focus: LT (6) or X (2)
    if (gamepadIsDown(6) || gamepadIsDown(2)) this.isFocusing = true;
    // Switch: B (1) or Bumpers (4/5)
    if (gamepadWasPressed(1) || gamepadWasPressed(4) || gamepadWasPressed(5)) {
      this.switchWeapon = true;
    }
  }

  updateTouch() {
    // LittleJS routes touch to mouse button 0
    if (mouseWasPressed(0) || mouseWasReleased(0)) {
      this.touchStartPos = mousePos.copy();
      this.touchActive = mouseWasPressed(0) || mouseIsDown(0);
    }

    if (mouseIsDown(0)) {
      this.isFiring = true; // Auto-fire while touching/clicking

      if (this.touchStartPos) {
        const delta = mousePos.subtract(this.touchStartPos);
        if (delta.length() > 0.01) {
          // Relative movement: scale the finger delta to movement dir
          let touchDir = delta.scale(this.touchSensitivity);
          if (touchDir.length() > 1) touchDir = touchDir.normalize();
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
