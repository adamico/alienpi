import { mainCanvasSize, timeReal, Color, rgb, vec2 } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { getTutorialStepState } from "../game/tutorialProgress.js";
import { makePanel } from "./panel.js";
import { makeCenterLine, makeCenterTitle } from "./uiText.js";
import { makeInputIcon, refreshInputIcon } from "./inputIcon.js";

const COLOR_PANEL = new Color(0, 0, 0, 0);
const COLOR_TITLE = rgb(0.4, 0.95, 1);
const COLOR_STEP = rgb(0.95, 0.95, 0.95);
const COLOR_HINT = rgb(0.7, 0.82, 1);
const COLOR_SKIP = rgb(0.8, 0.8, 0.8);

// Icon layout constants (UI-space pixels, 0 = canvas centre)
const STEP_ICON_Y = -115;
const STEP_ICON_SIZE = 64;
const SKIP_ICON_X = -190;
const SKIP_ICON_Y = 213;
const SKIP_ICON_SIZE = 38;

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

  // Input icons: one primary action icon + one skip icon
  // Both icons are created once and their tileInfo is refreshed each frame so
  // they automatically switch between keyboard and gamepad art.
  const stepIcon = makeInputIcon(group, "movement", vec2(0, STEP_ICON_Y), STEP_ICON_SIZE);
  const skipIcon = makeInputIcon(group, "skip", vec2(SKIP_ICON_X, SKIP_ICON_Y), SKIP_ICON_SIZE);

  let lastStepId = null;

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
      skipIcon.visible = skipText.visible;

      // Swap step icon when the step changes
      if (step.stepId !== lastStepId) {
        stepIcon._iconAction = step.stepId;
        lastStepId = step.stepId;
      }

      // Refresh icon sprites each frame so they follow the active input device
      refreshInputIcon(stepIcon);
      refreshInputIcon(skipIcon);
    },
  };
}
