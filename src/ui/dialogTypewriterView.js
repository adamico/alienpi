import { vec2, WHITE, Color } from "../engine.js";
import { makePanel } from "./panel.js";
import { makeText, makeCenterTitle, makeCenterLine } from "./uiText.js";

export function createDialogTitle(parent, { y = -270, color, label = "" } = {}) {
  return makeCenterTitle(parent, y, label, { color });
}

export function createDialogPrompt(
  parent,
  {
    y = 280,
    label,
    boxHeight = 40,
    textHeight = 20,
    color = WHITE,
  } = {},
) {
  return makeCenterLine(parent, y, label, {
    boxHeight,
    textHeight,
    color,
  });
}

export function createDialogBodyTypewriterView(
  parent,
  {
    parts,
    size = vec2(900, 420),
    textHeight = 22,
    linePitch = 28,
    paddingX = 16,
    textColor = WHITE,
    align = "left",
    wipeColor = new Color(0.02, 0.02, 0.08, 0.95),
  } = {},
) {
  const normalizedParts = (Array.isArray(parts) ? parts : []).map((part) => ({
    text: part,
    lines: String(part).split("\n"),
  }));

  const startY = -size.y / 2 + linePitch / 2;
  const maxLines = Math.max(...normalizedParts.map((part) => part.lines.length), 1);

  const lineTexts = Array.from({ length: maxLines }, (_, index) =>
    makeText(
      parent,
      vec2(-size.x / 2 + paddingX, startY + index * linePitch),
      vec2(size.x - paddingX * 2, linePitch),
      "",
      {
        textHeight,
        color: textColor,
        align,
      },
    ),
  );

  const wipe = makePanel(parent, {
    pos: vec2(0, startY - linePitch / 2),
    size: vec2(size.x, 0),
    color: wipeColor,
    lineWidth: 0,
  });
  wipe.visible = false;

  function clearLines() {
    for (const lineText of lineTexts) {
      lineText.text = "";
    }
  }

  function syncLines(partIndex, revealedChars) {
    const currentPart = normalizedParts[partIndex] ?? { lines: [] };
    let remainingChars = revealedChars;

    lineTexts.forEach((lineText, index) => {
      const line = currentPart.lines[index] ?? "";
      const visibleChars = Math.max(0, Math.min(line.length, remainingChars));
      lineText.text = line.slice(0, visibleChars);
      remainingChars -= line.length;
      if (index < currentPart.lines.length - 1) remainingChars -= 1;
    });
  }

  function updateWipe(wipeProgress) {
    if (wipeProgress <= 0) {
      wipe.visible = false;
      wipe.size = vec2(size.x, 0);
      return;
    }

    const wipeHeight = size.y * wipeProgress;
    wipe.visible = wipeHeight > 0;
    wipe.size = vec2(size.x, wipeHeight);
    wipe.localPos = vec2(0, -size.y / 2 + wipeHeight / 2);
  }

  function resetWipe() {
    wipe.visible = false;
    wipe.size = vec2(size.x, 0);
  }

  return {
    parts: normalizedParts,
    partTexts: normalizedParts.map((part) => part.text),
    clearLines,
    syncLines,
    updateWipe,
    resetWipe,
  };
}
