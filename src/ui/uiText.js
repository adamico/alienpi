import { UIText, vec2 } from "../engine.js";
import { FONT_MENU } from "../visuals/fonts.js";

/**
 * Creates a UIText node styled with FONT_MENU, appends it to parent,
 * and returns it for any further property overrides.
 *
 * @param {UIObject} parent
 * @param {Vector2}  pos
 * @param {Vector2}  size
 * @param {string}   label
 * @param {{ textHeight?: number, color?: Color, shadow?: boolean, align?: string }} [opts]
 */
export function makeText(
  parent,
  pos,
  size,
  label,
  { textHeight = 20, color, shadow = true, align = "center" } = {},
) {
  const text = new UIText(pos, size, label, align);
  text.textHeight = textHeight;
  text.font = FONT_MENU;
  text.fontShadow = shadow;
  if (color) text.textColor = color.copy();
  parent.addChild(text);
  return text;
}

export function makeCenterTitle(
  parent,
  y,
  label,
  { width = 800, boxHeight = 100, textHeight = 70, color, shadow = true } = {},
) {
  return makeText(parent, vec2(0, y), vec2(width, boxHeight), label, {
    textHeight,
    color,
    shadow,
  });
}

export function makeCenterLine(
  parent,
  y,
  label,
  { width = 800, boxHeight = 32, textHeight = 24, color, shadow = true } = {},
) {
  return makeText(parent, vec2(0, y), vec2(width, boxHeight), label, {
    textHeight,
    color,
    shadow,
  });
}
