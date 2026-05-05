import { UITile, vec2, WHITE, rgb } from "../engine.js";
import {
  GAMEPAD_INPUT_SPRITE_SHEET_NAME,
  KEYMOUSE_INPUT_SPRITE_SHEET_NAME,
} from "../config/index.js";
import { sprites } from "../visuals/sprites.js";
import { input } from "../input/input.js";
import { bindings, TUTORIAL_STEP_TO_ACTION } from "../input/bindings.js";

const KBD_FALLBACK = "keyboard_any";
const PAD_FALLBACK = "xbox_button_color_a";
const KBD_UNBOUND = "keyboard_arrows_none";
const PAD_UNBOUND = "xbox_dpad_none";

const UNBOUND_COLOR = rgb(1, 0.3, 0.3);

/**
 * Static, non-rebindable icons (movement and menu nav). Each entry lists
 * candidate sprite names that are tried left-to-right.
 */
const STATIC_ICON_MAP = {
  movement: {
    kb: ["keyboard_arrows_all"],
    gp: ["xbox_stick_l"],
  },
};

const KBD_KEY_TO_SPRITE = {
  Space: "keyboard_space",
  Enter: "keyboard_enter",
  Escape: "keyboard_escape",
  Tab: "keyboard_tab",
  Backspace: "keyboard_backspace",
  ShiftLeft: "keyboard_shift",
  ShiftRight: "keyboard_shift",
  ControlLeft: "keyboard_ctrl",
  ControlRight: "keyboard_ctrl",
  AltLeft: "keyboard_alt",
  AltRight: "keyboard_alt",
  MetaLeft: "keyboard_command",
  MetaRight: "keyboard_command",
  CapsLock: "keyboard_capslock",
  ArrowUp: "keyboard_arrow_up",
  ArrowDown: "keyboard_arrow_down",
  ArrowLeft: "keyboard_arrow_left",
  ArrowRight: "keyboard_arrow_right",
  Comma: "keyboard_comma",
  Period: "keyboard_period",
  Slash: "keyboard_slash",
  Semicolon: "keyboard_semicolon",
  Quote: "keyboard_apostrophe",
  Minus: "keyboard_minus",
  Equal: "keyboard_equals",
};

const PAD_INDEX_TO_SPRITE = {
  0: "xbox_button_color_a",
  1: "xbox_button_color_b",
  2: "xbox_button_color_x",
  3: "xbox_button_color_y",
  4: "xbox_lb",
  5: "xbox_rb",
  6: "xbox_lt",
  7: "xbox_rt",
  8: "xbox_button_view",
  9: "xbox_button_menu",
  10: "xbox_ls",
  11: "xbox_rs",
  12: "xbox_dpad_up",
  13: "xbox_dpad_down",
  14: "xbox_dpad_left",
  15: "xbox_dpad_right",
};

function kbdSpriteFor(code) {
  if (code == null) return KBD_UNBOUND;
  if (KBD_KEY_TO_SPRITE[code]) return KBD_KEY_TO_SPRITE[code];
  if (/^Key[A-Z]$/.test(code)) return `keyboard_${code.slice(3).toLowerCase()}`;
  if (/^Digit\d$/.test(code)) return `keyboard_${code.slice(5)}`;
  if (/^F\d{1,2}$/.test(code)) return `keyboard_${code.toLowerCase()}`;
  return KBD_FALLBACK;
}

function padSpriteFor(index) {
  if (index == null) return PAD_UNBOUND;
  return PAD_INDEX_TO_SPRITE[index] ?? PAD_FALLBACK;
}

function resolveActionForIcon(action) {
  if (TUTORIAL_STEP_TO_ACTION[action]) return TUTORIAL_STEP_TO_ACTION[action];
  return action;
}

function getStaticIconTile(action, source) {
  const mapping = STATIC_ICON_MAP[action];
  if (!mapping) return null;
  const names = source === "gamepad" ? mapping.gp : mapping.kb;
  const sheet =
    source === "gamepad"
      ? GAMEPAD_INPUT_SPRITE_SHEET_NAME
      : KEYMOUSE_INPUT_SPRITE_SHEET_NAME;
  for (const name of names) {
    const tile = sprites.get(name, sheet);
    if (tile) return tile;
  }
  return null;
}

/**
 * Returns { tile, unbound } for the given action under the active input
 * source. If the action is bound, `tile` is the sprite for the bound key /
 * button; if the action is fully unbound on that device, `tile` is the
 * "unbound" placeholder and `unbound` is true so the caller can tint it red.
 *
 * @param {string} action
 * @param {'keyboard'|'gamepad'} [sourceOverride]
 */
export function getInputIconResolution(action, sourceOverride) {
  const source = sourceOverride ?? input.lastInputSource;
  const resolved = resolveActionForIcon(action);

  const staticTile = getStaticIconTile(resolved, source);
  if (staticTile) return { tile: staticTile, unbound: false };

  const binding = bindings[resolved];
  if (!binding) {
    const sheet =
      source === "gamepad"
        ? GAMEPAD_INPUT_SPRITE_SHEET_NAME
        : KEYMOUSE_INPUT_SPRITE_SHEET_NAME;
    const fallback = sprites.get(
      source === "gamepad" ? PAD_FALLBACK : KBD_FALLBACK,
      sheet,
    );
    return { tile: fallback, unbound: false };
  }

  if (source === "gamepad") {
    const value = binding.pad;
    const name = padSpriteFor(value);
    const tile =
      sprites.get(name, GAMEPAD_INPUT_SPRITE_SHEET_NAME) ??
      sprites.get(PAD_FALLBACK, GAMEPAD_INPUT_SPRITE_SHEET_NAME);
    return { tile, unbound: value == null };
  }

  const value = binding.kbd;
  const name = kbdSpriteFor(value);
  const tile =
    sprites.get(name, KEYMOUSE_INPUT_SPRITE_SHEET_NAME) ??
    sprites.get(KBD_FALLBACK, KEYMOUSE_INPUT_SPRITE_SHEET_NAME);
  return { tile, unbound: value == null };
}

export function getInputIconTile(action, sourceOverride) {
  return getInputIconResolution(action, sourceOverride).tile;
}

/**
 * Creates a UITile that displays the input icon for the given action.
 * The tile can be updated later via `refreshInputIcon`.
 */
export function makeInputIcon(parent, action, pos, size) {
  const { tile, unbound } = getInputIconResolution(action);
  const uiSize = vec2(size, size);
  const color = unbound ? UNBOUND_COLOR.copy() : WHITE.copy();
  const uiTile = new UITile(pos, uiSize, tile, color);
  uiTile._iconAction = action;
  parent.addChild(uiTile);
  return uiTile;
}

/**
 * Updates a UITile's tileInfo + color to match the current binding and input
 * source. Call this each frame for live device + binding switching.
 */
export function refreshInputIcon(tile) {
  const { tile: newTile, unbound } = getInputIconResolution(
    tile._iconAction,
    tile._iconSource,
  );
  if (newTile) tile.tileInfo = newTile;
  tile.color = (unbound ? UNBOUND_COLOR : WHITE).copy();
}
