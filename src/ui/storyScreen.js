import { vec2, rgb, WHITE, Color, Timer, timeReal } from "../engine.js";
import { GAME_STATES, strings, ui } from "../config/index.js";
import { makePanel } from "./panel.js";
import { makeText, makeCenterTitle, makeCenterLine } from "./uiText.js";

export function createLoreScreen(uiRoot) {
  const revealCfg = ui.storyReveal;
  const bodyParts = [strings.story.body1, strings.story.body2, strings.story.body]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .map((part) => ({
      text: part,
      lines: part.split("\n"),
    }));
  const bodyTextSize = vec2(900, 420);
  const bodyTextHeight = 22;
  const bodyLinePitch = 28;
  const bodyPaddingX = 16;
  const bodyStartY = -bodyTextSize.y / 2 + bodyLinePitch / 2;
  const bodyPanelColor = new Color(0.02, 0.02, 0.08, 0.95);
  const loreGroup = makePanel(uiRoot, {
    color: new Color(0.02, 0.02, 0.08, 0.85),
  });

  const titleText = makeCenterTitle(loreGroup, -270, "", {
    color: rgb(1, 0.8, 0.2),
  });

  const maxBodyLines = Math.max(...bodyParts.map((part) => part.lines.length), 1);
  const bodyLineTexts = Array.from({ length: maxBodyLines }, (_, index) =>
    makeText(
      loreGroup,
      vec2(
        -bodyTextSize.x / 2 + bodyPaddingX,
        bodyStartY + index * bodyLinePitch,
      ),
      vec2(bodyTextSize.x - bodyPaddingX * 2, bodyLinePitch),
      "",
      {
        textHeight: bodyTextHeight,
        color: WHITE,
        align: "left",
      },
    ),
  );

  const bodyWipe = makePanel(loreGroup, {
    pos: vec2(0, bodyStartY - bodyLinePitch / 2),
    size: vec2(bodyTextSize.x, 0),
    color: bodyPanelColor,
    lineWidth: 0,
  });
  bodyWipe.visible = false;

  const promptText = makeCenterLine(loreGroup, 280, strings.story.startPrompt, {
    boxHeight: 40,
    textHeight: 20,
    color: WHITE,
  });
  promptText.visible = false;

  const skipPromptText = makeCenterLine(loreGroup, 320, strings.story.skipPrompt, {
    boxHeight: 32,
    textHeight: 18,
    color: new Color(1, 1, 1, 0.75),
  });
  skipPromptText.visible = true;

  let wasVisible = false;
  let titleTyped = "";
  let currentBodyIndex = 0;
  let bodyRevealStartTime = null;
  let bodyWipeStartTime = null;
  let nextBodyStartTime = null;
  let typeTimer = null;
  let promptStartTime = null;

  function getCurrentBodyPart() {
    return bodyParts[currentBodyIndex] ?? { text: "", lines: [] };
  }

  function syncBodyLines(revealedChars) {
    const currentBodyPart = getCurrentBodyPart();
    let remainingChars = revealedChars;

    bodyLineTexts.forEach((lineText, index) => {
      const line = currentBodyPart.lines[index] ?? "";
      const visibleChars = Math.max(0, Math.min(line.length, remainingChars));
      lineText.text = line.slice(0, visibleChars);
      remainingChars -= line.length;
      if (index < currentBodyPart.lines.length - 1) remainingChars -= 1;
    });
  }

  function clearBodyLines() {
    for (const lineText of bodyLineTexts) {
      lineText.text = "";
    }
  }

  function showCurrentBodyPartFully() {
    const currentBodyPart = getCurrentBodyPart();
    syncBodyLines(currentBodyPart.text.length);
    bodyRevealStartTime = null;
    if (currentBodyIndex < bodyParts.length - 1) {
      bodyWipeStartTime = timeReal + revealCfg.bodyPartHoldDelay;
    } else if (promptStartTime === null) {
      promptStartTime = timeReal + revealCfg.promptDelay;
    }
  }

  function showNextBodyPartImmediately() {
    if (currentBodyIndex >= bodyParts.length - 1) {
      if (promptStartTime !== null && timeReal < promptStartTime) {
        promptStartTime = timeReal;
      }
      return;
    }

    bodyRevealStartTime = null;
    bodyWipeStartTime = null;
    nextBodyStartTime = null;
    bodyWipe.visible = false;
    bodyWipe.size = vec2(bodyTextSize.x, 0);
    clearBodyLines();
    currentBodyIndex++;
    syncBodyLines(getCurrentBodyPart().text.length);

    if (currentBodyIndex < bodyParts.length - 1) {
      bodyWipeStartTime = timeReal + revealCfg.bodyPartHoldDelay;
    } else {
      promptStartTime = timeReal + revealCfg.promptDelay;
    }
  }

  function completeTitleImmediately() {
    titleTyped = strings.story.title;
    titleText.text = titleTyped;
    typeTimer = null;
    bodyRevealStartTime = timeReal;
  }

  function updateBodyWipe() {
    if (bodyWipeStartTime === null) {
      bodyWipe.visible = false;
      return;
    }

    const wipeProgress = Math.min(
      1,
      Math.max(0, (timeReal - bodyWipeStartTime) / revealCfg.bodyWipeDuration),
    );
    const wipeHeight = bodyTextSize.y * wipeProgress;
    bodyWipe.visible = wipeHeight > 0;
    bodyWipe.size = vec2(bodyTextSize.x, wipeHeight);
    bodyWipe.localPos = vec2(0, -bodyTextSize.y / 2 + wipeHeight / 2);

    if (wipeProgress >= 1) {
      bodyWipeStartTime = null;
      bodyWipe.visible = false;
      bodyWipe.size = vec2(bodyTextSize.x, 0);
      clearBodyLines();
      currentBodyIndex++;
      nextBodyStartTime = timeReal + revealCfg.bodyAfterWipeDelay;
    }
  }

  function resetReveal() {
    titleTyped = "";
    currentBodyIndex = 0;
    bodyRevealStartTime = null;
    bodyWipeStartTime = null;
    nextBodyStartTime = null;
    titleText.text = "";
    clearBodyLines();
    bodyWipe.visible = false;
    bodyWipe.size = vec2(bodyTextSize.x, 0);
    promptText.visible = false;
    skipPromptText.visible = true;
    promptStartTime = null;

    typeTimer = new Timer(revealCfg.titleCharInterval, true);
  }

  function updateReveal() {
    if (typeTimer && typeTimer.elapsed()) {
      titleTyped += strings.story.title.charAt(titleTyped.length);
      titleText.text = titleTyped;

      if (titleTyped.length < strings.story.title.length) {
        typeTimer.set(revealCfg.titleCharInterval);
      } else {
        typeTimer = null;
        bodyRevealStartTime = timeReal + revealCfg.titleToBodyDelay;
      }
    }

    if (nextBodyStartTime !== null && timeReal >= nextBodyStartTime) {
      nextBodyStartTime = null;
      bodyRevealStartTime = timeReal;
    }

    if (bodyRevealStartTime !== null) {
      const currentBodyPart = getCurrentBodyPart();
      const elapsed = Math.max(0, timeReal - bodyRevealStartTime);
      const revealedChars = Math.min(
        currentBodyPart.text.length,
        Math.floor(elapsed / revealCfg.bodyCharInterval),
      );
      syncBodyLines(revealedChars);

      if (revealedChars >= currentBodyPart.text.length) {
        bodyRevealStartTime = null;
        if (currentBodyIndex < bodyParts.length - 1) {
          bodyWipeStartTime = timeReal + revealCfg.bodyPartHoldDelay;
        } else if (promptStartTime === null) {
          promptStartTime = timeReal + revealCfg.promptDelay;
        }
      }
    }

    if (bodyWipeStartTime !== null) {
      updateBodyWipe();
    }

    const promptReady = promptStartTime !== null && timeReal >= promptStartTime;
    skipPromptText.visible = !promptReady;
    if (!promptReady) {
      promptText.visible = false;
      return;
    }

    const blinkPhase =
      ((timeReal - promptStartTime) * revealCfg.promptBlinkHz) % 1;
    promptText.visible = blinkPhase < revealCfg.promptBlinkDutyCycle;
  }

  return {
    root: loreGroup,
    handleConfirm() {
      const promptReady = promptStartTime !== null && timeReal >= promptStartTime;
      if (promptReady) {
        return true;
      }

      if (typeTimer) {
        completeTitleImmediately();
        showCurrentBodyPartFully();
        return false;
      }

      if (bodyRevealStartTime !== null) {
        showCurrentBodyPartFully();
        return false;
      }

      if (bodyWipeStartTime !== null || nextBodyStartTime !== null) {
        showNextBodyPartImmediately();
        return false;
      }

      if (promptStartTime !== null && timeReal < promptStartTime) {
        promptStartTime = timeReal;
        return false;
      }

      return false;
    },
    setVisible(v) {
      loreGroup.visible = v;
    },
    tick(gameState) {
      const visible = gameState === GAME_STATES.LORE;
      loreGroup.visible = visible;
      if (!visible) {
        wasVisible = false;
        return;
      }

      if (!wasVisible) {
        resetReveal();
        wasVisible = true;
      }

      updateReveal();
    },
  };
}
