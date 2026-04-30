import {
  vec2,
  drawRect,
  drawPoly,
  drawText,
  drawTextScreen,
  Color,
} from "./engine.js";
import { FONT_HUD } from "./fonts.js";

// Shared renderer for the hex "power cell" used by both the in-world Loot
// entity and the HUD weapon icons. Pass screenSpace=true for HUD usage.
export function drawLootCell(pos, size, baseColor, letter, screenSpace = false) {
  const w = size.x;
  const h = size.y;
  const a = baseColor.a;

  const cLight = new Color(
    Math.min(1, baseColor.r + (1 - baseColor.r) * 0.55),
    Math.min(1, baseColor.g + (1 - baseColor.g) * 0.55),
    Math.min(1, baseColor.b + (1 - baseColor.b) * 0.55),
    a,
  );
  const cBody = new Color(baseColor.r * 0.55, baseColor.g * 0.55, baseColor.b * 0.55, a);
  const frameDark = new Color(0.05, 0.05, 0.08, a);
  const white = new Color(1, 1, 1, a);
  const ledGlow = new Color(cLight.r, cLight.g, cLight.b, 0.6 * a);

  // Line widths scale with the cell height. In screen space LittleJS expects
  // pixel widths; in world space, world units. Same multiplier works for both
  // because callers pass `size` in matching units.
  const outlineW = h * 0.075;
  const innerW = h * 0.04;

  const cut = h * 0.5;
  const top = (h * 2) / 3;
  const hex = [
    vec2(-w / 2 + cut, top),
    vec2(w / 2 - cut, top),
    vec2(w / 2, 0),
    vec2(w / 2 - cut, -top),
    vec2(-w / 2 + cut, -top),
    vec2(-w / 2, 0),
  ];
  const frame = hex.map((p) => p.scale(1.1));
  const inner = hex.map((p) => p.scale(0.78));

  drawPoly(frame, frameDark, 0, frameDark, pos, 0, false, screenSpace);
  drawPoly(hex, cBody, outlineW, cLight, pos, 0, false, screenSpace);
  drawPoly(
    inner,
    new Color(0, 0, 0, 0),
    innerW,
    new Color(cLight.r, cLight.g, cLight.b, 0.45 * a),
    pos,
    0,
    false,
    screenSpace,
  );

  const ledLeft = pos.add(vec2(-w / 2 + h * 0.1, 0));
  const ledRight = pos.add(vec2(w / 2 - h * 0.1, 0));
  drawRect(ledLeft, vec2(h * 0.3, h * 0.22), ledGlow, 0, false, screenSpace);
  drawRect(ledRight, vec2(h * 0.3, h * 0.22), ledGlow, 0, false, screenSpace);
  drawRect(ledLeft, vec2(h * 0.15, h * 0.11), white, 0, false, screenSpace);
  drawRect(ledRight, vec2(h * 0.15, h * 0.11), white, 0, false, screenSpace);

  if (letter) {
    const fn = screenSpace ? drawTextScreen : drawText;
    // In screen space text size is in pixels; in world space it's in world units.
    // h is already in matching units, so the same multiplier works.
    fn(
      letter,
      pos.add(vec2(0, screenSpace ? h * 0.05 : -h * 0.05)),
      h * 0.8,
      white,
      h * 0.12,
      new Color(0, 0, 0, 0.8 * a),
      "center",
      FONT_HUD,
    );
  }
}
