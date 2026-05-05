import { vec2, Color } from "../engine.js";
import { ui } from "../config/index.js";
import { FONT_MENU } from "../visuals/fonts.js";
import { makeInputIcon, refreshInputIcon } from "./inputIcon.js";
import { makeText } from "./uiText.js";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function measureLabelWidth(text, pxHeight) {
  measureCtx.font = `${pxHeight}px ${FONT_MENU}`;
  return measureCtx.measureText(text).width;
}

const DEFAULT_LABEL_COLOR = new Color(0.9, 0.9, 0.9, 1);

/**
 * Builds a horizontal strip of [input-icon, label] pairs centered at x=0.
 * Returns an object whose `refresh()` swaps icon sprites to match the
 * current input source — call it each frame the strip is visible.
 *
 * @param {UIObject} parent
 * @param {{action: string, label: string}[]} hints
 * @param {{y: number, iconSize?: number, color?: Color}} opts
 */
export function makeFooterHints(parent, hints, opts = {}) {
  const {
    iconSize = ui.footerHints.iconSize,
    color = DEFAULT_LABEL_COLOR,
  } = opts;
  const y = ui.footerHints.y;
  const gap = ui.footerHints.iconLabelGap;
  const spacing = ui.footerHints.hintSpacing;
  const labelHeight = ui.footerHints.labelHeight;

  const widths = hints.map((h) => measureLabelWidth(h.label, labelHeight));
  let totalWidth = 0;
  for (let i = 0; i < hints.length; i++) {
    totalWidth += iconSize + gap + widths[i];
    if (i < hints.length - 1) totalWidth += spacing;
  }

  let cursor = -totalWidth / 2;
  const items = [];
  hints.forEach((hint, i) => {
    const iconX = cursor + iconSize / 2;
    const tile = makeInputIcon(parent, hint.action, vec2(iconX, y), iconSize);
    cursor += iconSize + gap;

    const labelWidth = widths[i];
    const labelX = cursor + labelWidth / 2;
    const text = makeText(
      parent,
      vec2(labelX, y),
      vec2(labelWidth + 10, labelHeight + 8),
      hint.label,
      { textHeight: labelHeight, color },
    );
    items.push({ tile, text });
    cursor += labelWidth + spacing;
  });

  return {
    items,
    refresh() {
      for (const { tile } of items) refreshInputIcon(tile);
    },
    setVisible(visible) {
      for (const { tile, text } of items) {
        tile.visible = visible;
        text.visible = visible;
      }
    },
  };
}
