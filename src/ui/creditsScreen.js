import { vec2, rgb, WHITE, Color, timeReal } from "../engine.js";
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

export function createCreditsScreen(uiRoot) {
  const revealCfg = ui.creditsReveal;
  const bodyParts = buildDialogParts(strings.credits.body);
  const creditsGroup = makePanel(uiRoot, {
    color: new Color(0.02, 0.02, 0.08, 0.85),
  });

  const titleText = createDialogTitle(creditsGroup, {
    y: -260,
    label: "",
    color: rgb(1, 0.8, 0.2),
  });

  const bodyView = createDialogBodyTypewriterView(creditsGroup, {
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

  const promptText = createDialogPrompt(creditsGroup, {
    y: 280,
    label: strings.credits.backPrompt,
    boxHeight: 40,
    textHeight: 20,
    color: rgb(0.6, 0.9, 1),
  });
  promptText.visible = false;

  const skipPromptText = createDialogPrompt(creditsGroup, {
    y: 320,
    label: strings.credits.skipPrompt,
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
    title: strings.credits.title,
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
    root: creditsGroup,
    handleConfirm() {
      const result = revealController.confirm(timeReal);
      revealState = result.state;
      applyRevealState(revealState);
      return result.advance;
    },
    setVisible(v) {
      creditsGroup.visible = v;
    },
    tick(gameState) {
      const visible = gameState === GAME_STATES.CREDITS;
      creditsGroup.visible = visible;
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
