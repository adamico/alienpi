// Reusable keyboard-driven menu controller.
// Each item: { label, kind: "action"|"toggle"|"slider", activate?, toggle?, adjust?(dir), getDisplay?() }
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
      if (item.kind === "action") item.activate?.();
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      if (item.kind === "slider") item.adjust?.(-1);
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    if (code === "ArrowRight" || code === "KeyD") {
      if (item.kind === "slider") item.adjust?.(1);
      else if (item.kind === "toggle") item.toggle?.();
      return true;
    }
    return false;
  }
}

export const SLIDER_STEP = 0.1;

export function adjustSetting(obj, key, dir, step = SLIDER_STEP, min = 0, max = 1) {
  obj[key] = Math.max(min, Math.min(max, obj[key] + dir * step));
}
