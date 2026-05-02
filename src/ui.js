import { UIObject, mainCanvasSize, Color } from "./engine.js";
import { getUIContext, uiViewRegistry } from "./ui/viewRegistry.js";

let uiRoot;
let uiViews = [];

export { titleMenu, pauseMenu, settingsMenu } from "./ui/menus.js";

export function initUI({ handlers = {} } = {}) {
  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  uiViews = uiViewRegistry.map((entry) => ({
    entry,
    view: entry.create(uiRoot, handlers),
  }));
}

export function updateUI() {
  if (!uiRoot) return;

  const context = getUIContext();
  uiRoot.pos = mainCanvasSize.scale(0.5).floor();
  uiRoot.size = mainCanvasSize;

  for (const { entry, view } of uiViews) {
    entry.tick(view, context);
  }
}

export function handleUIConfirmForState(state) {
  for (const { entry, view } of uiViews) {
    if (!entry.confirmStates || !entry.confirmStates.includes(state)) continue;
    if (!view || typeof view.handleConfirm !== "function") return true;
    return view.handleConfirm();
  }
  return true;
}
