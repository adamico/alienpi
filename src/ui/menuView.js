import {
  vec2,
  UIObject,
  UIText,
  Color,
  mouseWasPressed,
  mouseWasReleased,
} from "../engine.js";
import { FONT_MENU } from "../fonts.js";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function measureTextWidth(text, pxHeight, font) {
  measureCtx.font = `${pxHeight}px ${font}`;
  return measureCtx.measureText(text).width;
}

export function makeMenuRow(parent, y, h = 40) {
  const row = new UIObject(vec2(0, y), vec2(800, h));
  row.color = new Color(0, 0, 0, 0);
  row.lineWidth = 0;
  parent.addChild(row);

  const text = new UIText(vec2(0, 0), vec2(800, h), "");
  text.textHeight = 30;
  text.fontShadow = true;
  text.font = FONT_MENU;
  row.addChild(text);

  const cursor = new UIText(vec2(-260, 0), vec2(40, h), "");
  cursor.textHeight = 30;
  cursor.fontShadow = true;
  cursor.font = FONT_MENU;
  row.addChild(cursor);

  return { row, text, cursor };
}

export function updateMenuInteraction(menu, rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.row.visible) continue;

    if (row.row.isMouseOverlapping()) {
      if (menu.focusedIndex !== i) {
        menu.focusedIndex = i;
      }

      if (mouseWasPressed(0) || mouseWasReleased(0)) {
        const item = menu.items[i];
        if (item) {
          if (item.kind === "action") item.activate?.();
          else if (item.kind === "toggle") item.toggle?.();
          return true;
        }
      }
    }
  }
  return false;
}

export function paintMenu(menu, rows, focusColor, idleColor) {
  for (let i = 0; i < rows.length; i++) {
    const item = menu.items[i];
    const row = rows[i];
    if (!item) {
      row.text.text = "";
      row.cursor.text = "";
      row.row.visible = false;
      continue;
    }

    row.row.visible = true;
    const focused = menu.focusedIndex === i;
    const label = item.label();
    row.text.text = label;
    row.text.textColor = focused ? focusColor.copy() : idleColor.copy();
    row.cursor.text = focused ? ">" : "";
    row.cursor.textColor = focusColor.copy();

    if (focused) {
      const labelWidth = measureTextWidth(
        label,
        row.text.textHeight,
        row.text.font,
      );
      const gap = row.text.textHeight * 0.4;
      row.cursor.localPos = vec2(-labelWidth / 2 - gap, 0);
    }
  }
}
