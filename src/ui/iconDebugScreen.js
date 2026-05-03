import {
  mainCanvasSize,
  Color,
  rgb,
  vec2,
  UITile,
  UIText,
  UIObject,
  keyIsDown,
  mouseWheel,
} from "../engine.js";
import {
  GAME_STATES,
  GAMEPAD_INPUT_SPRITE_SHEET_NAME,
  // eslint-disable-next-line no-unused-vars
  KEYMOUSE_INPUT_SPRITE_SHEET_NAME,
} from "../config/index.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
import { sprites } from "../visuals/sprites.js";

const COLOR_PANEL = new Color(0.1, 0.1, 0.1, 0.95);
const COLOR_TEXT = rgb(1, 1, 1);
const COLOR_LABEL = rgb(0.5, 0.8, 1);

let currentSpriteSheet = GAMEPAD_INPUT_SPRITE_SHEET_NAME;

export function createIconDebugScreen(uiRoot) {
  // Main container that stays fixed
  const mainGroup = makePanel(uiRoot, { color: COLOR_PANEL });
  mainGroup.visible = false;

  // Scrollable container for icons
  const scrollGroup = new UIObject(vec2(0), mainCanvasSize);
  scrollGroup.color = new Color(0, 0, 0, 0);
  mainGroup.addChild(scrollGroup);

  const titleY = -mainCanvasSize.y / 2 + 50; // TOP in UI space
  const title = makeCenterTitle(
    mainGroup,
    titleY,
    "ICON DEBUG - " + currentSpriteSheet,
    {
      color: COLOR_TEXT,
      textHeight: 40,
      shadow: true,
    },
  );

  const names = sprites.getNames(currentSpriteSheet).sort();
  const iconSize = 64;
  const padding = 80;
  const cols = 6;
  const tiles = [];
  const labels = [];

  const gridWidth = (cols - 1) * (iconSize + padding);
  const startX = -gridWidth / 2;
  const startY = titleY + 70; // Moving DOWN from title

  names.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const pos = vec2(
      startX + col * (iconSize + padding),
      startY + row * (iconSize + padding * 2), // Move DOWN for each row
    );

    const tile = new UITile(
      pos,
      vec2(iconSize),
      sprites.get(name, currentSpriteSheet),
      COLOR_TEXT,
    );
    scrollGroup.addChild(tile);
    tiles.push(tile);

    const label = new UIText(
      pos.add(vec2(0, iconSize / 2 + 15)), // Label BELOW icon (increase Y)
      vec2(iconSize + padding - 10, 30),
      name,
    );
    label.textColor = COLOR_LABEL;
    label.textHeight = 12;
    scrollGroup.addChild(label);
    labels.push(label);
  });

  // Scrollbar components
  const scrollbarWidth = 10;
  const scrollbarTrack = new UIObject(
    vec2(mainCanvasSize.x / 2 - 20, 0),
    vec2(scrollbarWidth, mainCanvasSize.y - 100),
  );
  scrollbarTrack.color = new Color(0.2, 0.2, 0.2, 0.5);
  scrollbarTrack.cornerRadius = 5;
  mainGroup.addChild(scrollbarTrack);

  const scrollbarThumb = new UIObject(
    vec2(mainCanvasSize.x / 2 - 20, 0),
    vec2(scrollbarWidth + 4, 50),
  );
  scrollbarThumb.color = rgb(0.5, 0.8, 1);
  scrollbarThumb.cornerRadius = 6;
  mainGroup.addChild(scrollbarThumb);

  let scrollOffset = 0;
  const rows = Math.ceil(names.length / cols);
  const contentHeight = rows * padding * 2 + 200;

  // Debug offset label
  const debugLabel = new UIText(
    vec2(0, mainCanvasSize.y / 2 - 20), // BOTTOM in UI space
    vec2(200, 20),
    "",
  );
  debugLabel.textColor = rgb(1, 1, 0);
  debugLabel.textHeight = 14;
  mainGroup.addChild(debugLabel);

  return {
    group: mainGroup,
    tick(gameState) {
      const visible = gameState === GAME_STATES.ICON_DEBUG;
      mainGroup.visible = visible;
      if (!visible) return;

      mainGroup.size = mainCanvasSize;

      // Handle scrolling
      const scrollSpeed = 100;
      if (keyIsDown("ArrowDown")) scrollOffset += scrollSpeed;
      if (keyIsDown("ArrowUp")) scrollOffset -= scrollSpeed;
      scrollOffset -= mouseWheel * 50;

      // Clamp scroll
      const viewHeight = mainCanvasSize.y;
      const maxScroll = Math.max(0, contentHeight - viewHeight);
      scrollOffset = Math.min(maxScroll, Math.max(0, scrollOffset));

      // Moving the group UP means DECREASING Y in UI space
      scrollGroup.localPos.y = -scrollOffset;
      debugLabel.text = `Scroll Offset: ${Math.round(scrollOffset)} / ${Math.round(maxScroll)}`;

      // Update scrollbar
      const trackHeight = mainCanvasSize.y - 100;
      const thumbHeight = Math.max(
        30,
        (viewHeight / contentHeight) * trackHeight,
      );
      scrollbarThumb.size.y = thumbHeight;

      const scrollPercent = maxScroll > 0 ? scrollOffset / maxScroll : 0;
      // Scrollbar thumb moves DOWN (+Y) as offset increases
      const thumbY =
        -trackHeight / 2 +
        thumbHeight / 2 +
        scrollPercent * (trackHeight - thumbHeight);
      scrollbarThumb.localPos.y = thumbY;

      title.localPos.y = -mainCanvasSize.y / 2 + 50;
      debugLabel.localPos.y = mainCanvasSize.y / 2 - 20;
    },
  };
}
