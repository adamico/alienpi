import { vec2, rgb, WHITE, UIObject, UIText, Color } from "../engine.js";
import { FONT_MENU } from "../fonts.js";

export function createLoreScreen({ uiRoot, mainCanvasSize, strings }) {
  const loreGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  loreGroup.color = new Color(0.02, 0.02, 0.08, 0.85);
  loreGroup.lineWidth = 0;
  uiRoot.addChild(loreGroup);

  const loreTitleText = new UIText(
    vec2(0, -270),
    vec2(800, 100),
    strings.ui.loreTitle,
  );
  loreTitleText.textHeight = 70;
  loreTitleText.font = FONT_MENU;
  loreTitleText.fontShadow = true;
  loreTitleText.textColor = rgb(1, 0.8, 0.2);
  loreGroup.addChild(loreTitleText);

  const loreBodyText = new UIText(
    vec2(0, 0),
    vec2(900, 420),
    strings.ui.loreBody,
  );
  loreBodyText.textHeight = 22;
  loreBodyText.font = FONT_MENU;
  loreBodyText.textColor = WHITE.copy();
  loreBodyText.fontShadow = true;
  loreGroup.addChild(loreBodyText);

  const loreStartText = new UIText(
    vec2(0, 280),
    vec2(800, 40),
    strings.ui.loreStartPrompt,
  );
  loreStartText.textHeight = 20;
  loreStartText.font = FONT_MENU;
  loreStartText.textColor = WHITE.copy();
  loreStartText.fontShadow = true;
  loreGroup.addChild(loreStartText);

  return { loreGroup, loreTitleText, loreBodyText, loreStartText };
}

export function createCreditsScreen({ uiRoot, mainCanvasSize, strings }) {
  const creditsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  creditsGroup.color = new Color(0.02, 0.02, 0.08, 0.85);
  creditsGroup.lineWidth = 0;
  uiRoot.addChild(creditsGroup);

  const creditsTitleText = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.creditsTitle,
  );
  creditsTitleText.textHeight = 70;
  creditsTitleText.font = FONT_MENU;
  creditsTitleText.fontShadow = true;
  creditsTitleText.textColor = rgb(1, 0.8, 0.2);
  creditsGroup.addChild(creditsTitleText);

  const creditsBodyText = new UIText(
    vec2(0, 0),
    vec2(900, 420),
    strings.ui.creditsBody,
  );
  creditsBodyText.textHeight = 22;
  creditsBodyText.font = FONT_MENU;
  creditsBodyText.textColor = WHITE.copy();
  creditsBodyText.fontShadow = true;
  creditsGroup.addChild(creditsBodyText);

  const creditsBackText = new UIText(
    vec2(0, 280),
    vec2(800, 40),
    strings.ui.creditsBackPrompt,
  );
  creditsBackText.textHeight = 20;
  creditsBackText.font = FONT_MENU;
  creditsBackText.textColor = rgb(0.6, 0.9, 1);
  creditsBackText.fontShadow = true;
  creditsGroup.addChild(creditsBackText);

  return { creditsGroup, creditsTitleText, creditsBodyText, creditsBackText };
}
