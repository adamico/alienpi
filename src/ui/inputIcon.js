import { UITile, vec2, WHITE } from "../engine.js";
import {
  GAMEPAD_INPUT_SPRITE_SHEET_NAME,
  KEYMOUSE_INPUT_SPRITE_SHEET_NAME,
} from "../config/index.js";
import { sprites } from "../visuals/sprites.js";
import { input } from "../input/input.js";

/**
 * Maps tutorial step IDs (and generic action keys) to sprite names for each
 * input device.  Both arrays are tried left-to-right and the first sprite
 * found in the atlas is used, so you can list a preferred name followed by a
 * fallback.
 */
const ICON_MAP = {
  //  action key          keyboard sprite(s)                   gamepad sprite(s)
  movement:      { kb: ["keyboard_arrows_all"],               gp: ["xbox_stick_l"] },
  focus:         { kb: ["keyboard_shift"],                    gp: ["xbox_lt"] },
  fireVulcan:    { kb: ["keyboard_space"],                    gp: ["xbox_button_color_a"] },
  fireShotgun:   { kb: ["keyboard_space"],                    gp: ["xbox_button_color_a"] },
  fireLatch:     { kb: ["keyboard_space"],                    gp: ["xbox_button_color_a"] },
  switchShotgun: { kb: ["keyboard_q"],                        gp: ["xbox_rb"] },
  switchLatch:   { kb: ["keyboard_q"],                        gp: ["xbox_rb"] },
  confirm:       { kb: ["keyboard_enter"],                    gp: ["xbox_button_color_a"] },
  skip:          { kb: ["keyboard_space", "keyboard_enter"],  gp: ["xbox_button_color_a"] },
};

/**
 * Returns the TileInfo for an action given the current input source, or null.
 *
 * @param {string} action - Key from ICON_MAP
 * @param {'keyboard'|'gamepad'} [sourceOverride] - Force a specific source
 * @returns {TileInfo|null}
 */
export function getInputIconTile(action, sourceOverride) {
  const mapping = ICON_MAP[action];
  if (!mapping) return null;

  const source = sourceOverride ?? input.lastInputSource;
  const names = source === "gamepad" ? mapping.gp : mapping.kb;
  const sheet =
    source === "gamepad"
      ? GAMEPAD_INPUT_SPRITE_SHEET_NAME
      : KEYMOUSE_INPUT_SPRITE_SHEET_NAME;

  for (const name of names) {
    const tile = sprites.get(name, sheet);
    if (tile) {
      return tile;
    }
  }
  return null;
}

/**
 * Creates a UITile that displays the input icon for the given action.
 * The tile can be updated later via `refreshInputIcon`.
 *
 * @param {UIObject} parent
 * @param {string}   action - Key from ICON_MAP
 * @param {Vector2}  pos    - Position relative to parent
 * @param {number}   size   - Icon width/height in UI units (square)
 * @returns {UITile}
 */
export function makeInputIcon(parent, action, pos, size) {
  const tileInfo = getInputIconTile(action) ?? sprites.get("keyboard_any", KEYMOUSE_INPUT_SPRITE_SHEET_NAME);
  const uiSize = vec2(size, size);
  const tile = new UITile(pos, uiSize, tileInfo, WHITE.copy());
  tile._iconAction = action;
  parent.addChild(tile);
  return tile;
}

/**
 * Updates a UITile's tileInfo to match the current input source.
 * Call this each frame (or when the input source changes) for live switching.
 *
 * @param {UITile} tile - A tile previously created by makeInputIcon
 */
export function refreshInputIcon(tile) {
  const newTile = getInputIconTile(tile._iconAction);
  if (newTile) tile.tileInfo = newTile;
}
