import { mainCanvasSize, timeReal, Color, rgb } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { getTutorialStepState } from "../game/tutorialProgress.js";
import { makePanel } from "./panel.js";
import { makeCenterLine, makeCenterTitle } from "./uiText.js";

const COLOR_PANEL = new Color(0, 0, 0, 0);
const COLOR_TITLE = rgb(0.4, 0.95, 1);
const COLOR_STEP = rgb(0.95, 0.95, 0.95);
const COLOR_HINT = rgb(0.7, 0.82, 1);
const COLOR_SKIP = rgb(0.8, 0.8, 0.8);

function getStepCopy(stepId) {
  switch (stepId) {
    case "movement":
      return strings.tutorial.movement;
    case "focus":
      return strings.tutorial.focus;
    case "fireVulcan":
      return strings.tutorial.fireVulcan;
    case "switchShotgun":
      return strings.tutorial.switchShotgun;
    case "fireShotgun":
      return strings.tutorial.fireShotgun;
    case "switchLatch":
      return strings.tutorial.switchLatch;
    case "fireLatch":
      return strings.tutorial.fireLatch;
    default:
      return "";
  }
}

export function createTutorialScreen(uiRoot) {
  const group = makePanel(uiRoot, { color: COLOR_PANEL });

  const title = makeCenterTitle(group, -250, strings.tutorial.title, {
    color: COLOR_TITLE,
    textHeight: 56,
    shadow: false,
  });

  const subtitle = makeCenterLine(group, -190, strings.tutorial.subtitle, {
    color: COLOR_HINT,
    textHeight: 24,
    shadow: false,
  });

  const stepText = makeCenterTitle(group, -40, "", {
    color: COLOR_STEP,
    textHeight: 48,
    shadow: false,
  });

  const progressText = makeCenterLine(group, 20, "", {
    color: COLOR_HINT,
    textHeight: 22,
    shadow: false,
  });

  const skipText = makeCenterLine(group, 220, strings.tutorial.skipPrompt, {
    color: COLOR_SKIP,
    textHeight: 18,
    shadow: false,
  });

  return {
    group,
    tick(gameState) {
      const visible = gameState === GAME_STATES.TUTORIAL;
      group.visible = visible;
      if (!visible) return;

      group.size = mainCanvasSize;
      title.text = strings.tutorial.title;
      subtitle.text = strings.tutorial.subtitle;

      const step = getTutorialStepState();
      stepText.text = getStepCopy(step.stepId);
      progressText.text = `${step.stepIndex}/${step.totalSteps}`;

      skipText.visible = (timeReal * 2) % 2 < 1.2;
    },
  };
}
