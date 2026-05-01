import { vec2, rgb, WHITE, Color } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { makePanel } from "./panel.js";
import { makeText, makeCenterTitle, makeCenterLine } from "./uiText.js";

export function createLoreScreen(uiRoot) {
  const loreGroup = makePanel(uiRoot, {
    color: new Color(0.02, 0.02, 0.08, 0.85),
  });

  makeCenterTitle(loreGroup, -270, strings.story.title, {
    color: rgb(1, 0.8, 0.2),
  });

  makeText(loreGroup, vec2(0, 0), vec2(900, 420), strings.story.body, {
    textHeight: 22,
    color: WHITE,
  });

  makeCenterLine(loreGroup, 280, strings.story.startPrompt, {
    boxHeight: 40,
    textHeight: 20,
    color: WHITE,
  });

  return {
    root: loreGroup,
    setVisible(v) {
      loreGroup.visible = v;
    },
    tick(gameState) {
      loreGroup.visible = gameState === GAME_STATES.LORE;
    },
  };
}

export function createCreditsScreen(uiRoot) {
  const creditsGroup = makePanel(uiRoot, {
    color: new Color(0.02, 0.02, 0.08, 0.85),
  });

  makeCenterTitle(creditsGroup, -260, strings.credits.title, {
    color: rgb(1, 0.8, 0.2),
  });

  makeText(
    creditsGroup,
    vec2(0, 0),
    vec2(900, 420),
    strings.credits.body,
    { textHeight: 22, color: WHITE },
  );

  makeCenterLine(creditsGroup, 280, strings.credits.backPrompt, {
    boxHeight: 40,
    textHeight: 20,
    color: rgb(0.6, 0.9, 1),
  });

  return {
    root: creditsGroup,
    setVisible(v) {
      creditsGroup.visible = v;
    },
    tick(gameState) {
      creditsGroup.visible = gameState === GAME_STATES.CREDITS;
    },
  };
}
