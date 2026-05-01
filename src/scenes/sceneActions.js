import {
  keyWasPressed,
  gamepadWasReleased,
  mouseWasReleased,
  gamepadStick,
} from "../engine.js";

export const SCENE_ACTION = {
  NAV_UP: "NAV_UP",
  NAV_DOWN: "NAV_DOWN",
  NAV_LEFT: "NAV_LEFT",
  NAV_RIGHT: "NAV_RIGHT",
  CONFIRM: "CONFIRM",
  CANCEL: "CANCEL",
  PAUSE: "PAUSE",
  POINTER_SELECT: "POINTER_SELECT",
};

export function createSceneActionCollector({ vec2 }) {
  let lastGamepadStick = vec2(0);

  return function collectSceneActions() {
  const actions = [];
  const seen = new Set();
  const push = (type, source) => {
    if (seen.has(type)) return;
    seen.add(type);
    actions.push({ type, source });
  };

  if (keyWasPressed("ArrowUp") || keyWasPressed("KeyW")) {
    push(SCENE_ACTION.NAV_UP, "keyboard");
  }
  if (keyWasPressed("ArrowDown") || keyWasPressed("KeyS")) {
    push(SCENE_ACTION.NAV_DOWN, "keyboard");
  }
  if (keyWasPressed("ArrowLeft") || keyWasPressed("KeyA")) {
    push(SCENE_ACTION.NAV_LEFT, "keyboard");
  }
  if (keyWasPressed("ArrowRight") || keyWasPressed("KeyD")) {
    push(SCENE_ACTION.NAV_RIGHT, "keyboard");
  }

  if (keyWasPressed("Enter") || keyWasPressed("Space") || gamepadWasReleased(0)) {
    push(SCENE_ACTION.CONFIRM, "confirm");
  }
  if (keyWasPressed("Escape") || gamepadWasReleased(8) || gamepadWasReleased(1)) {
    push(SCENE_ACTION.CANCEL, "cancel");
  }
  if (keyWasPressed("Escape") || keyWasPressed("KeyP") || gamepadWasReleased(11)) {
    push(SCENE_ACTION.PAUSE, "pause");
  }

  if (mouseWasReleased(0)) {
    push(SCENE_ACTION.POINTER_SELECT, "pointer");
  }

  const stick = gamepadStick(0);
  const threshold = 0.5;
  if (gamepadWasReleased(12) || (stick.y > threshold && lastGamepadStick.y <= threshold)) {
    push(SCENE_ACTION.NAV_UP, "gamepad");
  }
  if (gamepadWasReleased(13) || (stick.y < -threshold && lastGamepadStick.y >= -threshold)) {
    push(SCENE_ACTION.NAV_DOWN, "gamepad");
  }
  if (gamepadWasReleased(14) || (stick.x < -threshold && lastGamepadStick.x >= -threshold)) {
    push(SCENE_ACTION.NAV_LEFT, "gamepad");
  }
  if (gamepadWasReleased(15) || (stick.x > threshold && lastGamepadStick.x <= threshold)) {
    push(SCENE_ACTION.NAV_RIGHT, "gamepad");
  }

    lastGamepadStick = stick;
    return { actions };
  };
}

export function hasSceneAction(actions, actionType) {
  return actions.some((a) => a.type === actionType);
}

export function dispatchMenuFromSceneActions(menu, actions) {
  const actionTypes = new Set(actions.map((a) => a.type));

  // Keep legacy behavior: consume at most one action each frame.
  if (actionTypes.has(SCENE_ACTION.NAV_UP)) return menu.handleKey("ArrowUp");
  if (actionTypes.has(SCENE_ACTION.NAV_DOWN))
    return menu.handleKey("ArrowDown");
  if (actionTypes.has(SCENE_ACTION.NAV_LEFT))
    return menu.handleKey("ArrowLeft");
  if (actionTypes.has(SCENE_ACTION.NAV_RIGHT))
    return menu.handleKey("ArrowRight");
  if (actionTypes.has(SCENE_ACTION.CONFIRM)) return menu.handleKey("Enter");
  if (actionTypes.has(SCENE_ACTION.CANCEL)) return menu.handleKey("Escape");

  return false;
}
