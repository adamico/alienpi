import {
  vec2,
  rgb,
  WHITE,
  UIObject,
  UIText,
  UITile,
  timeReal,
  mainCanvasSize,
  Color,
  mouseWasReleased,
} from "../engine.js";
import { sprites } from "../visuals/sprites.js";
import { GAME_STATES, strings } from "../config/index.js";
import { FONT_MENU } from "../visuals/fonts.js";
import { formatHighScore } from "../game/score.js";
import { makeMenuRow, paintMenu, updateMenuInteraction } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeText } from "./uiText.js";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

const TITLE_INITIAL_HEIGHT = 100;
const TITLE_REST_HEIGHT = 64;
const TITLE_INITIAL_COLORS = [
  rgb(1, 0.4, 0.5),
  rgb(0.4, 0.9, 1),
  rgb(1, 0.85, 0.3),
];

const SOCIAL_LINKS = [
  { sprite: "discord.png", key: "discord" },
  { sprite: "github.png", key: "github" },
  { sprite: "itchio.png", key: "itch" },
  { sprite: "bluesky.png", key: "bluesky" },
];

const SOCIAL_IDLE_COLOR = new Color(1, 1, 1, 0.45);
const SOCIAL_HOVER_COLOR = new Color(1, 1, 1, 1);

const FOCUS_COLOR = rgb(1, 0.9, 0.3);
const IDLE_COLOR = WHITE;

function measureTextWidth(text, pxHeight, font) {
  measureCtx.font = `${pxHeight}px ${font}`;
  return measureCtx.measureText(text).width;
}

function buildSegmentedTitle(parent, initialTexts, title, y, opts = {}) {
  const { offset = vec2(0, 0), glowTint = null } = opts;
  if (!glowTint) initialTexts.length = 0;
  const words = title.split(/\s+/);
  const spaceWidth = TITLE_REST_HEIGHT * 0.45;

  let totalWidth = 0;
  const measured = words.map((word) => {
    const initial = word.slice(0, 1);
    const rest = word.slice(1);
    const initialWidth = measureTextWidth(initial, TITLE_INITIAL_HEIGHT, FONT_MENU);
    const restWidth = rest
      ? measureTextWidth(rest, TITLE_REST_HEIGHT, FONT_MENU)
      : 0;
    totalWidth += initialWidth + restWidth;
    return { initial, rest, initialWidth, restWidth };
  });
  totalWidth += spaceWidth * (words.length - 1);

  let cursor = -totalWidth / 2;
  measured.forEach((segment, index) => {
    const initialX = cursor + segment.initialWidth / 2;
    const initialText = new UIText(
      vec2(initialX + offset.x, y + offset.y),
      vec2(segment.initialWidth + 20, TITLE_INITIAL_HEIGHT + 20),
      segment.initial,
    );
    initialText.textHeight = TITLE_INITIAL_HEIGHT;
    initialText.font = FONT_MENU;
    initialText.fontShadow = !glowTint;
    const accent = glowTint || TITLE_INITIAL_COLORS[index % TITLE_INITIAL_COLORS.length];
    initialText.textColor = accent.copy();
    if (!glowTint) {
      initialText._baseColor = accent.copy();
      initialTexts.push(initialText);
    }
    parent.addChild(initialText);
    cursor += segment.initialWidth;

    if (segment.rest) {
      const restX = cursor + segment.restWidth / 2;
      const restY = y + (TITLE_INITIAL_HEIGHT - TITLE_REST_HEIGHT) / 2;
      const restText = new UIText(
        vec2(restX + offset.x, restY + offset.y),
        vec2(segment.restWidth + 20, TITLE_REST_HEIGHT + 20),
        segment.rest,
      );
      restText.textHeight = TITLE_REST_HEIGHT;
      restText.font = FONT_MENU;
      restText.fontShadow = !glowTint;
      restText.textColor = (glowTint || WHITE).copy();
      parent.addChild(restText);
      cursor += segment.restWidth;
    }
    cursor += spaceWidth;
  });
}

function openLink(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function createTitleScreen(uiRoot, titleMenu, handlers) {
  const initialTexts = [];
  const socialIcons = [];

  const titleGroup = makePanel(uiRoot, {
    color: new Color(0, 0, 0.08, 0.35),
  });

  const bossSprite = sprites.get("boss2.png");
  if (bossSprite) {
    const bossDecor = new UITile(vec2(0, -40), vec2(420, 420), bossSprite);
    bossDecor.color = new Color(1, 0.4, 0.4, 0.18);
    titleGroup.addChild(bossDecor);
  }

  buildSegmentedTitle(titleGroup, initialTexts, strings.title.title, -200, {
    offset: vec2(-3, 2),
    glowTint: new Color(1, 0.2, 0.5, 0.45),
  });
  buildSegmentedTitle(titleGroup, initialTexts, strings.title.title, -200, {
    offset: vec2(3, -2),
    glowTint: new Color(0.2, 0.8, 1, 0.45),
  });
  buildSegmentedTitle(titleGroup, initialTexts, strings.title.title, -200);

  const controlGroup = new UIObject(vec2(0, -30), vec2(600, 160));
  controlGroup.color = new Color(0, 0, 0, 0);
  controlGroup.lineWidth = 0;
  titleGroup.addChild(controlGroup);

  makeText(controlGroup, vec2(0, -50), vec2(400, 30), strings.title.controlsTitle,
    { textHeight: 22, color: rgb(0.2, 1, 0.4) });

  makeText(controlGroup, vec2(0, 20), vec2(600, 100), strings.title.controlsBody,
    { textHeight: 18, color: WHITE });

  const highScoreText = makeText(
    titleGroup,
    vec2(0, -110),
    vec2(600, 30),
    strings.title.highScorePrefix + formatHighScore(),
    { textHeight: 22, color: rgb(1, 0.85, 0.3) },
  );

  const menuRows = [
    makeMenuRow(titleGroup, 140),
    makeMenuRow(titleGroup, 185),
    makeMenuRow(titleGroup, 230),
    makeMenuRow(titleGroup, 275),
    makeMenuRow(titleGroup, 320),
    makeMenuRow(titleGroup, 365),
  ];

  const iconSize = 48;
  const spacing = 64;
  const totalWidth = (SOCIAL_LINKS.length - 1) * spacing;
  const baseX = -totalWidth / 2;
  const y = 320;

  SOCIAL_LINKS.forEach((entry, index) => {
    const tile = sprites.get(entry.sprite);
    if (!tile) return;
    const aspect = tile.size.y / tile.size.x;
    const icon = new UITile(
      vec2(baseX + index * spacing, y),
      vec2(iconSize, iconSize * aspect),
      tile,
    );
    icon.lineWidth = 0;
    icon.color = SOCIAL_IDLE_COLOR;
    titleGroup.addChild(icon);
    socialIcons.push({ icon, key: entry.key, hovered: false });
  });

  titleMenu.setItems([
    {
      kind: "action",
      label: () => "START",
      activate: () => handlers.start(),
    },
    {
      kind: "action",
      label: () => strings.title.replayTutorial,
      activate: () => handlers.replayTutorial?.(),
    },
    {
      kind: "action",
      label: () => "SETTINGS",
      activate: () => handlers.openSettings(),
    },
    {
      kind: "action",
      label: () => "CREDITS",
      activate: () => handlers.openCredits(),
    },
  ]);

  return {
    root: titleGroup,
    setVisible(visible) {
      titleGroup.visible = visible;
    },
    update({ menu, focusColor, idleColor }) {
      titleGroup.size = mainCanvasSize;
      paintMenu(menu, menuRows, focusColor, idleColor);

      const pulse = 0.85 + 0.15 * Math.sin(timeReal * 3);
      for (const text of initialTexts) {
        text.textColor = text._baseColor.copy();
        text.textColor.a *= pulse;
      }

      highScoreText.text = strings.title.highScorePrefix + formatHighScore();

      const links = strings.links;
      const clicked = mouseWasReleased(0);
      for (const entry of socialIcons) {
        const hovered = entry.icon.isHoverObject();
        if (hovered !== entry.hovered) {
          entry.icon.color = hovered ? SOCIAL_HOVER_COLOR : SOCIAL_IDLE_COLOR;
          entry.hovered = hovered;
        }
        if (hovered && clicked) {
          const link = links[entry.key];
          if (link) openLink(link.url);
        }
      }
    },
    processPointer(menu) {
      updateMenuInteraction(menu, menuRows);
    },
    tick(gameState) {
      titleGroup.visible = gameState === GAME_STATES.TITLE;
      if (titleGroup.visible) {
        this.update({ menu: titleMenu, focusColor: FOCUS_COLOR, idleColor: IDLE_COLOR });
        this.processPointer(titleMenu);
      }
    },
  };
}
