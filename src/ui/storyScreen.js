import { vec2, rgb, WHITE, Color, timeReal, mainCanvasSize } from "../engine.js";
import { GAME_STATES, strings, ui } from "../config/index.js";
import { makePanel } from "./panel.js";
import { createMultipartTypewriter } from "./typewriter.js";
import { createDialogRevealController } from "./dialogRevealController.js";
import { buildDialogParts } from "./dialogParts.js";
import {
  createDialogBodyTypewriterView,
  createDialogPrompt,
  createDialogTitle,
} from "./dialogTypewriterView.js";

export function createLoreScreen(uiRoot) {
  const revealCfg = ui.storyReveal;
  const bodyParts = buildDialogParts(
    strings.story.body1,
    strings.story.body2,
    strings.story.body,
  );
  const loreGroup = makePanel(uiRoot, {
    color: new Color(0.02, 0.02, 0.08, 0.85),
  });

  const titleText = createDialogTitle(loreGroup, {
    y: -270,
    label: "",
    color: rgb(1, 0.8, 0.2),
  });

  const bodyView = createDialogBodyTypewriterView(loreGroup, {
    parts: bodyParts,
    size: vec2(900, 420),
    textHeight: 22,
    linePitch: 28,
    paddingX: 16,
    textColor: WHITE,
    align: "left",
    wipeColor: new Color(0.02, 0.02, 0.08, 0.95),
  });
  const bodyPartTexts = bodyView.partTexts;

  const promptText = createDialogPrompt(loreGroup, {
    y: 280,
    label: strings.story.startPrompt,
    boxHeight: 40,
    textHeight: 20,
    color: WHITE,
  });
  promptText.visible = false;

  const skipPromptText = createDialogPrompt(loreGroup, {
    y: 320,
    label: strings.story.skipPrompt,
    boxHeight: 32,
    textHeight: 18,
    color: new Color(1, 1, 1, 0.75),
  });
  skipPromptText.visible = true;

  let wasVisible = false;
  let revealState = {
    titleText: "",
    bodyPartIndex: 0,
    bodyRevealedChars: 0,
    bodyWipeProgress: 0,
    promptReady: false,
    showStartPrompt: false,
    showSkipPrompt: true,
  };

  const bodyTypewriter = createMultipartTypewriter({
    parts: bodyPartTexts,
    charInterval: revealCfg.bodyCharInterval,
    holdDelay: revealCfg.bodyPartHoldDelay,
    wipeDuration: revealCfg.bodyWipeDuration,
    afterWipeDelay: revealCfg.bodyAfterWipeDelay,
    skipTransitionMode: "next-full",
  });

  const revealController = createDialogRevealController({
    title: strings.story.title,
    revealCfg,
    bodyTypewriter,
  });

  function applyRevealState(state) {
    titleText.text = state.titleText;
    bodyView.syncLines(state.bodyPartIndex, state.bodyRevealedChars);
    bodyView.updateWipe(state.bodyWipeProgress);
    skipPromptText.visible = state.showSkipPrompt;
    promptText.visible = state.showStartPrompt;
  }

  function resetReveal() {
    bodyView.clearLines();
    bodyView.resetWipe();
    revealState = revealController.reset(timeReal);
    applyRevealState(revealState);
  }

  function updateReveal() {
    revealState = revealController.update(timeReal);
    applyRevealState(revealState);
  }

  return {
    root: loreGroup,
    handleConfirm() {
      const result = revealController.confirm(timeReal);
      revealState = result.state;
      applyRevealState(revealState);
      return result.advance;
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

      loreGroup.size = mainCanvasSize;

      if (!wasVisible) {
        resetReveal();
        wasVisible = true;
      }

      updateReveal();
    },
  };
}
