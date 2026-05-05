import {
  vec2,
  rgb,
  WHITE,
  Color,
  UIObject,
  mainCanvasSize,
  keyWasPressed,
  gamepadWasPressed,
  mouseWasReleased,
  timeReal,
} from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import {
  REMAPPABLE_ACTIONS,
  LOCKED_ACTIONS,
  bindings,
  setBinding,
  resetBindingsToDefaults,
} from "../input/bindings.js";
import { SCENE_ACTION } from "../scenes/sceneActions.js";
import { playSfx } from "../audio/soundManager.js";
import { soundMenuConfirm, soundMenuHover } from "../audio/sounds.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle, makeText } from "./uiText.js";
import { makeFooterHints } from "./footerHints.js";
import { makeInputIcon, refreshInputIcon } from "./inputIcon.js";

const PANEL_COLOR = new Color(0.04, 0.04, 0.1, 0.95);
const HEADER_Y = -240;
const COL_LABEL_X = -260;
const COL_KBD_X = 60;
const COL_PAD_X = 220;
const TABLE_TOP_Y = -180;
const ROW_SPACING = 44;
const ICON_SIZE = 36;
const RESET_Y_OFFSET = 30; // gap below last row
const BACK_Y_OFFSET = 70;
const MODAL_PANEL_COLOR = new Color(0, 0, 0, 0.75);
const FOCUS_COLOR = rgb(1, 0.9, 0.3);
const IDLE_COLOR = WHITE;
const TOOLTIP_DURATION = 1.5;
const HOVER_VOLUME = 1.4;
const CONFIRM_VOLUME = 0.55;
const CELL_HIT_SIZE = 60;
const RESET_HIT_SIZE = vec2(500, 36);
const BACK_HIT_SIZE = vec2(300, 36);

const RESERVED_KBD = new Set([
  "Escape",
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

const RESERVED_PAD = new Set([12, 13, 14, 15]);
const PAD_CAPTURE_CANCEL_BUTTON = 8;

const KBD_CAPTURE_CODES = [
  ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
  "Space",
  "Enter",
  "Tab",
  "Backspace",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "Comma",
  "Period",
  "Slash",
  "Semicolon",
  "Quote",
  "BracketLeft",
  "BracketRight",
  "Backquote",
  "Backslash",
  "Minus",
  "Equal",
  "CapsLock",
];

// Cells: per-row {kbd, pad}. Extra rows below table: reset, back.
const COL = { KBD: 0, PAD: 1 };

export function createControlsScreen(uiRoot, handlers) {
  const group = makePanel(uiRoot, { color: PANEL_COLOR });
  group.visible = false;

  makeCenterTitle(group, -300, strings.controls.title, {
    color: rgb(1, 0.8, 0.2),
  });

  // Column headers
  makeText(
    group,
    vec2(COL_LABEL_X, HEADER_Y),
    vec2(220, 28),
    strings.controls.columnAction,
    { textHeight: 18, color: rgb(0.6, 0.7, 0.9) },
  );
  makeText(
    group,
    vec2(COL_KBD_X, HEADER_Y),
    vec2(140, 28),
    strings.controls.columnKeyboard,
    { textHeight: 18, color: rgb(0.6, 0.7, 0.9) },
  );
  makeText(
    group,
    vec2(COL_PAD_X, HEADER_Y),
    vec2(140, 28),
    strings.controls.columnGamepad,
    { textHeight: 18, color: rgb(0.6, 0.7, 0.9) },
  );

  function makeHitBox(parent, pos, size) {
    const hit = new UIObject(pos, size);
    hit.color = new Color(0, 0, 0, 0);
    hit.lineWidth = 0;
    parent.addChild(hit);
    return hit;
  }

  // M6: confirm/cancel/skip stay locked at their defaults so the player can
  // never softlock themselves out of the menus. They remain in the registry
  // (so footer hints + tutorial icons resolve correctly) but never show up
  // in the rebind table — and their bindings are off-limits to other actions.
  const editableActions = REMAPPABLE_ACTIONS.filter((a) => !LOCKED_ACTIONS.has(a));

  function isLockedValue(device, value) {
    for (const action of LOCKED_ACTIONS) {
      if (bindings[action]?.[device] === value) return true;
    }
    return false;
  }

  const rows = editableActions.map((action, i) => {
    const y = TABLE_TOP_Y + i * ROW_SPACING;
    const label = makeText(
      group,
      vec2(COL_LABEL_X, y),
      vec2(220, ROW_SPACING - 4),
      strings.controls.labels[action] ?? action.toUpperCase(),
      { textHeight: 22, color: WHITE },
    );
    const kbdIcon = makeInputIcon(group, action, vec2(COL_KBD_X, y), ICON_SIZE);
    const padIcon = makeInputIcon(group, action, vec2(COL_PAD_X, y), ICON_SIZE);
    // Force per-icon source so kbd column always shows kbd, pad column always pad.
    kbdIcon._iconSource = "keyboard";
    padIcon._iconSource = "gamepad";
    const kbdHit = makeHitBox(
      group,
      vec2(COL_KBD_X, y),
      vec2(CELL_HIT_SIZE, CELL_HIT_SIZE),
    );
    const padHit = makeHitBox(
      group,
      vec2(COL_PAD_X, y),
      vec2(CELL_HIT_SIZE, CELL_HIT_SIZE),
    );
    return { action, y, label, kbdIcon, padIcon, kbdHit, padHit };
  });

  const lastRowY = TABLE_TOP_Y + (editableActions.length - 1) * ROW_SPACING;
  const resetY = lastRowY + RESET_Y_OFFSET + ROW_SPACING;
  const backY = resetY + BACK_Y_OFFSET;

  const resetText = makeText(
    group,
    vec2(0, resetY),
    RESET_HIT_SIZE,
    strings.controls.reset,
    { textHeight: 22, color: WHITE },
  );
  const backText = makeText(
    group,
    vec2(0, backY),
    BACK_HIT_SIZE,
    strings.controls.back,
    { textHeight: 22, color: WHITE },
  );
  const resetHit = makeHitBox(group, vec2(0, resetY), RESET_HIT_SIZE);
  const backHit = makeHitBox(group, vec2(0, backY), BACK_HIT_SIZE);

  const footer = makeFooterHints(
    group,
    [
      { action: "confirm", label: "REBIND" },
      { action: "cancel", label: "BACK" },
    ],
  );

  // Modal overlay
  const modalGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  modalGroup.color = MODAL_PANEL_COLOR;
  modalGroup.lineWidth = 0;
  group.addChild(modalGroup);
  const modalPrompt = makeText(
    modalGroup,
    vec2(0, -20),
    vec2(800, 50),
    "",
    { textHeight: 32, color: rgb(1, 0.9, 0.3) },
  );
  makeText(
    modalGroup,
    vec2(0, 30),
    vec2(800, 30),
    strings.controls.captureCancel,
    { textHeight: 18, color: new Color(0.8, 0.8, 0.8, 1) },
  );
  const modalTooltip = makeText(
    modalGroup,
    vec2(0, 80),
    vec2(800, 30),
    strings.controls.reservedTooltip,
    { textHeight: 18, color: rgb(1, 0.4, 0.4) },
  );
  modalTooltip.visible = false;
  modalGroup.visible = false;

  let focusedRow = 0;
  let focusedCol = COL.KBD;
  /** "rows" | "reset" | "back" */
  let focusedZone = "rows";
  let captureState = null; // { action, device } when modal open
  let captureSettled = false; // becomes true the frame AFTER enterCapture
  let resetArmedUntil = 0;
  let tooltipUntil = 0;
  let lastHoverKey = null; // tracks pointer hover transitions

  function focusKey() {
    if (focusedZone === "rows") return `rows:${focusedRow}:${focusedCol}`;
    return focusedZone;
  }

  function playHover() {
    playSfx(soundMenuHover, undefined, HOVER_VOLUME, 1);
  }

  function playConfirm() {
    playSfx(soundMenuConfirm, undefined, CONFIRM_VOLUME, 1);
  }

  function setFocus(zone, row, col) {
    const before = focusKey();
    focusedZone = zone;
    if (row != null) focusedRow = row;
    if (col != null) focusedCol = col;
    if (focusKey() !== before) playHover();
  }

  function enterCapture(action, device) {
    captureState = { action, device };
    captureSettled = false;
    modalGroup.visible = true;
    modalPrompt.text =
      device === "kbd"
        ? strings.controls.captureKbd
        : strings.controls.capturePad;
    modalTooltip.visible = false;
  }

  function exitCapture() {
    captureState = null;
    captureSettled = false;
    modalGroup.visible = false;
  }

  function showTooltip() {
    tooltipUntil = timeReal + TOOLTIP_DURATION;
  }

  function pollKbdCapture() {
    if (keyWasPressed("Escape")) {
      exitCapture();
      return;
    }
    for (const code of RESERVED_KBD) {
      if (code === "Escape") continue;
      if (keyWasPressed(code)) {
        showTooltip();
        return;
      }
    }
    for (const code of KBD_CAPTURE_CODES) {
      if (keyWasPressed(code)) {
        if (isLockedValue("kbd", code)) {
          showTooltip();
          return;
        }
        setBinding(captureState.action, "kbd", code);
        exitCapture();
        return;
      }
    }
  }

  function pollPadCapture() {
    if (keyWasPressed("Escape")) {
      exitCapture();
      return;
    }
    if (gamepadWasPressed(PAD_CAPTURE_CANCEL_BUTTON)) {
      exitCapture();
      return;
    }
    for (let i = 0; i <= 15; i++) {
      if (gamepadWasPressed(i)) {
        if (RESERVED_PAD.has(i)) {
          showTooltip();
          return;
        }
        if (isLockedValue("pad", i)) {
          showTooltip();
          return;
        }
        setBinding(captureState.action, "pad", i);
        exitCapture();
        return;
      }
    }
  }

  function moveFocusVertical(dir) {
    if (focusedZone === "rows") {
      const next = focusedRow + dir;
      if (next < 0) setFocus("back");
      else if (next >= rows.length) setFocus("reset");
      else setFocus("rows", next, null);
    } else if (focusedZone === "reset") {
      if (dir > 0) setFocus("back");
      else setFocus("rows", rows.length - 1, null);
    } else {
      // back
      if (dir > 0) setFocus("rows", 0, null);
      else setFocus("reset");
    }
  }

  function moveFocusHorizontal(dir) {
    if (focusedZone !== "rows") return;
    const next = focusedCol + dir < 0 ? COL.PAD : (focusedCol + dir) % 2;
    setFocus("rows", focusedRow, next);
  }

  function activateFocused() {
    if (focusedZone === "rows") {
      const row = rows[focusedRow];
      playConfirm();
      enterCapture(row.action, focusedCol === COL.KBD ? "kbd" : "pad");
      return;
    }
    if (focusedZone === "reset") {
      playConfirm();
      if (timeReal < resetArmedUntil) {
        resetBindingsToDefaults();
        resetArmedUntil = 0;
      } else {
        resetArmedUntil = timeReal + 3;
      }
      return;
    }
    if (focusedZone === "back") {
      playConfirm();
      handlers.back?.();
    }
  }

  function pollPointer() {
    // Hover detection: scan all interactive zones.
    let hoverKey = null;
    let hoverApply = null;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.kbdHit.isMouseOverlapping()) {
        hoverKey = `rows:${i}:${COL.KBD}`;
        hoverApply = () => setFocus("rows", i, COL.KBD);
        break;
      }
      if (row.padHit.isMouseOverlapping()) {
        hoverKey = `rows:${i}:${COL.PAD}`;
        hoverApply = () => setFocus("rows", i, COL.PAD);
        break;
      }
    }
    if (!hoverKey && resetHit.isMouseOverlapping()) {
      hoverKey = "reset";
      hoverApply = () => setFocus("reset");
    }
    if (!hoverKey && backHit.isMouseOverlapping()) {
      hoverKey = "back";
      hoverApply = () => setFocus("back");
    }

    if (hoverKey && hoverKey !== lastHoverKey) hoverApply();
    lastHoverKey = hoverKey;

    if (hoverKey && mouseWasReleased(0)) activateFocused();
  }

  function paintFocus() {
    rows.forEach((row, i) => {
      const focused = focusedZone === "rows" && i === focusedRow;
      const kbdFocused = focused && focusedCol === COL.KBD;
      const padFocused = focused && focusedCol === COL.PAD;
      row.label.textColor = focused ? FOCUS_COLOR.copy() : IDLE_COLOR.copy();
      // Highlight focused cell by tinting; refreshInputIcon resets color each
      // frame so we re-apply after.
      if (kbdFocused) row.kbdIcon.color = FOCUS_COLOR.copy();
      if (padFocused) row.padIcon.color = FOCUS_COLOR.copy();
    });
    resetText.textColor =
      focusedZone === "reset" ? FOCUS_COLOR.copy() : IDLE_COLOR.copy();
    resetText.text =
      timeReal < resetArmedUntil
        ? strings.controls.resetConfirm
        : strings.controls.reset;
    backText.textColor =
      focusedZone === "back" ? FOCUS_COLOR.copy() : IDLE_COLOR.copy();
  }

  function refreshIcons() {
    for (const row of rows) {
      refreshInputIconForced(row.kbdIcon, "keyboard");
      refreshInputIconForced(row.padIcon, "gamepad");
    }
  }

  return {
    group,
    handleSceneActions(actions) {
      if (captureState) {
        // While capturing, swallow nav/confirm — capture poll handles input.
        return true;
      }
      for (const a of actions) {
        if (a.type === SCENE_ACTION.NAV_UP) moveFocusVertical(-1);
        else if (a.type === SCENE_ACTION.NAV_DOWN) moveFocusVertical(1);
        else if (a.type === SCENE_ACTION.NAV_LEFT) moveFocusHorizontal(-1);
        else if (a.type === SCENE_ACTION.NAV_RIGHT) moveFocusHorizontal(1);
        else if (a.type === SCENE_ACTION.CONFIRM) {
          activateFocused();
          return true;
        } else if (a.type === SCENE_ACTION.CANCEL) {
          handlers.back?.();
          return true;
        }
      }
      return false;
    },
    tick(gameState) {
      const visible = gameState === GAME_STATES.CONTROLS;
      group.visible = visible;
      if (!visible) {
        if (captureState) exitCapture();
        return;
      }
      group.size = mainCanvasSize;

      if (captureState) {
        if (captureSettled) {
          if (captureState.device === "kbd") pollKbdCapture();
          else pollPadCapture();
        } else {
          captureSettled = true;
        }
        modalTooltip.visible = timeReal < tooltipUntil;
      } else {
        pollPointer();
      }

      refreshIcons();
      paintFocus();
      footer.refresh();
    },
  };
}

function refreshInputIconForced(tile, source) {
  // Local helper that mirrors refreshInputIcon but pins the source per cell.
  // Reuses the underlying resolver via a temporary _iconSource read in the
  // resolver, but for simplicity we re-import the resolver and call directly.
  // Implemented inline below to avoid an extra import surface.
  tile._iconSource = source;
  refreshInputIcon(tile);
}
