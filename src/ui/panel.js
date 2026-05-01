import { UIObject, vec2, mainCanvasSize, Color } from "../engine.js";

export function makePanel(
  parent,
  { pos = vec2(0, 0), size = mainCanvasSize, color = new Color(0, 0, 0, 0), lineWidth = 0 } = {},
) {
  const panel = new UIObject(pos, size);
  panel.color = color.copy();
  panel.lineWidth = lineWidth;
  parent.addChild(panel);
  return panel;
}