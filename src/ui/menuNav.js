// Reusable keyboard-driven menu controller.
// Each item: { label, kind: "action"|"toggle"|"slider", activate?, toggle?, adjust?(dir), getDisplay?() }
import { playSfx } from "../audio/soundManager.js";
import { soundMenuConfirm, soundMenuHover } from "../audio/sounds.js";

const MENU_HOVER_VOLUME = 1.4;
const MENU_CONFIRM_VOLUME = 0.55;
const MENU_CONFIRM_ADJUST_VOLUME = 0.5;

export class Menu {
  constructor(items = []) {
    this.items = items;
    this.focusedIndex = 0;
  }

  setItems(items) {
    this.items = items;
    if (this.focusedIndex >= items.length) this.focusedIndex = 0;
  }

  moveFocus(delta) {
    const n = this.items.length;
    if (!n) return;
    this.focusedIndex = (this.focusedIndex + delta + n) % n;
    playSfx(soundMenuHover, undefined, MENU_HOVER_VOLUME, 1);
  }

  handleKey(code) {
    if (code === "ArrowUp" || code === "KeyW") {
      this.moveFocus(-1);
      return true;
    }
    if (code === "ArrowDown" || code === "KeyS") {
      this.moveFocus(1);
      return true;
    }
    const item = this.items[this.focusedIndex];
    if (!item) return false;
    if (code === "Enter" || code === "Space") {
      playSfx(soundMenuConfirm, undefined, MENU_CONFIRM_VOLUME, 1);
      if (item.kind === "action") item.activate?.();
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      playSfx(soundMenuConfirm, undefined, MENU_CONFIRM_ADJUST_VOLUME, 0.97);
      if (item.kind === "slider") item.adjust?.(-1);
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    if (code === "ArrowRight" || code === "KeyD") {
      playSfx(soundMenuConfirm, undefined, MENU_CONFIRM_ADJUST_VOLUME, 1.03);
      if (item.kind === "slider") item.adjust?.(1);
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    return false;
  }
}

export const SLIDER_STEP = 0.1;

export function adjustSetting(
  obj,
  key,
  dir,
  step = SLIDER_STEP,
  min = 0,
  max = 1,
) {
  obj[key] = Math.max(min, Math.min(max, obj[key] + dir * step));
}
