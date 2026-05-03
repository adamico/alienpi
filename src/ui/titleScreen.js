import {
  vec2,
  rgb,
  WHITE,
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
import { makeMenuRow, paintMenu, updateMenuInteraction } from "./menuView.js";
import { makePanel } from "./panel.js";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

const TITLE_PANEL_COLOR = new Color(0, 0, 0.08, 0.35);

const TITLE_INITIAL_HEIGHT = 100;
const TITLE_REST_HEIGHT = 64;
const TITLE_TEXT_PADDING = 20;
const TITLE_WORD_SPACING_RATIO = 0.45;
const TITLE_Y = -200;
const TITLE_PULSE_BASE = 0.85;
const TITLE_PULSE_RANGE = 0.15;
const TITLE_PULSE_SPEED = 3;
const TITLE_INITIAL_COLORS = [
  rgb(1, 0.4, 0.5),
  rgb(0.4, 0.9, 1),
  rgb(1, 0.85, 0.3),
];
const TITLE_GLOW_LAYERS = [
  { offset: vec2(-3, 2), tint: new Color(1, 0.2, 0.5, 0.45) },
  { offset: vec2(3, -2), tint: new Color(0.2, 0.8, 1, 0.45) },
];

const BOSS_DECOR_SPRITE = "boss2.png";
const BOSS_DECOR_POS = vec2(0, -40);
const BOSS_DECOR_SIZE = vec2(420, 420);
const BOSS_DECOR_COLOR = new Color(1, 0.4, 0.4, 0.18);

const MENU_START_Y = 60;
const MENU_ROW_SPACING = 45;
const MENU_ROW_COUNT = 6;

const MENU_LABEL_START = "START";
const MENU_LABEL_SETTINGS = "SETTINGS";
const MENU_LABEL_CREDITS = "CREDITS";

const SOCIAL_LINKS = [
  { sprite: "discord.png", key: "discord" },
  { sprite: "github.png", key: "github" },
  { sprite: "itchio.png", key: "itch" },
  { sprite: "bluesky.png", key: "bluesky" },
];
const SOCIAL_Y = 300;
const SOCIAL_ICON_SIZE = 48;
const SOCIAL_ICON_SPACING = 64;

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
  const spaceWidth = TITLE_REST_HEIGHT * TITLE_WORD_SPACING_RATIO;

  let totalWidth = 0;
  const measured = words.map((word) => {
    const initial = word.slice(0, 1);
    const rest = word.slice(1);
    const initialWidth = measureTextWidth(
      initial,
      TITLE_INITIAL_HEIGHT,
      FONT_MENU,
    );
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
      vec2(
        segment.initialWidth + TITLE_TEXT_PADDING,
        TITLE_INITIAL_HEIGHT + TITLE_TEXT_PADDING,
      ),
      segment.initial,
    );
    initialText.textHeight = TITLE_INITIAL_HEIGHT;
    initialText.font = FONT_MENU;
    initialText.fontShadow = !glowTint;
    const accent =
      glowTint || TITLE_INITIAL_COLORS[index % TITLE_INITIAL_COLORS.length];
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
        vec2(
          segment.restWidth + TITLE_TEXT_PADDING,
          TITLE_REST_HEIGHT + TITLE_TEXT_PADDING,
        ),
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

function addBossDecoration(parent) {
  const bossSprite = sprites.get(BOSS_DECOR_SPRITE);
  if (!bossSprite) return;

  const bossDecor = new UITile(BOSS_DECOR_POS, BOSS_DECOR_SIZE, bossSprite);
  bossDecor.color = BOSS_DECOR_COLOR;
  parent.addChild(bossDecor);
}

function addTitleLayers(parent, initialTexts) {
  for (const layer of TITLE_GLOW_LAYERS) {
    buildSegmentedTitle(parent, initialTexts, strings.title.title, TITLE_Y, {
      offset: layer.offset,
      glowTint: layer.tint,
    });
  }
  buildSegmentedTitle(parent, initialTexts, strings.title.title, TITLE_Y);
}

function buildMenuRows(parent) {
  const menuRows = [];
  for (let i = 0; i < MENU_ROW_COUNT; i++) {
    menuRows.push(makeMenuRow(parent, MENU_START_Y + i * MENU_ROW_SPACING));
  }
  return menuRows;
}

function buildSocialIcons(parent) {
  const socialIcons = [];
  const totalWidth = (SOCIAL_LINKS.length - 1) * SOCIAL_ICON_SPACING;
  const baseX = -totalWidth / 2;

  SOCIAL_LINKS.forEach((entry, index) => {
    const tile = sprites.get(entry.sprite);
    if (!tile) return;
    const aspect = tile.size.y / tile.size.x;
    const icon = new UITile(
      vec2(baseX + index * SOCIAL_ICON_SPACING, SOCIAL_Y),
      vec2(SOCIAL_ICON_SIZE, SOCIAL_ICON_SIZE * aspect),
      tile,
    );
    icon.lineWidth = 0;
    icon.color = SOCIAL_IDLE_COLOR;
    parent.addChild(icon);
    socialIcons.push({ icon, key: entry.key, hovered: false });
  });

  return socialIcons;
}

function setTitleMenuItems(titleMenu, handlers) {
  titleMenu.setItems([
    {
      kind: "action",
      label: () => MENU_LABEL_START,
      activate: () => handlers.start(),
    },
    {
      kind: "action",
      label: () => strings.title.replayTutorial,
      activate: () => handlers.replayTutorial?.(),
    },
    {
      kind: "action",
      label: () => MENU_LABEL_SETTINGS,
      activate: () => handlers.openSettings(),
    },
    {
      kind: "action",
      label: () => MENU_LABEL_CREDITS,
      activate: () => handlers.openCredits(),
    },
  ]);
}

function animateTitleInitials(initialTexts) {
  const pulse =
    TITLE_PULSE_BASE + TITLE_PULSE_RANGE * Math.sin(timeReal * TITLE_PULSE_SPEED);
  for (const text of initialTexts) {
    text.textColor = text._baseColor.copy();
    text.textColor.a *= pulse;
  }
}

function updateSocialLinks(socialIcons, links) {
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
}

export function createTitleScreen(uiRoot, titleMenu, handlers) {
  const initialTexts = [];

  const titleGroup = makePanel(uiRoot, {
    color: TITLE_PANEL_COLOR,
  });

  addBossDecoration(titleGroup);
  addTitleLayers(titleGroup, initialTexts);

  const menuRows = buildMenuRows(titleGroup);
  const socialIcons = buildSocialIcons(titleGroup);

  setTitleMenuItems(titleMenu, handlers);

  return {
    root: titleGroup,
    setVisible(visible) {
      titleGroup.visible = visible;
    },
    update({ menu, focusColor, idleColor }) {
      titleGroup.size = mainCanvasSize;
      paintMenu(menu, menuRows, focusColor, idleColor);

      animateTitleInitials(initialTexts);
      updateSocialLinks(socialIcons, strings.links);
    },
    processPointer(menu) {
      updateMenuInteraction(menu, menuRows);
    },
    tick(gameState) {
      titleGroup.visible = gameState === GAME_STATES.TITLE;
      if (titleGroup.visible) {
        this.update({
          menu: titleMenu,
          focusColor: FOCUS_COLOR,
          idleColor: IDLE_COLOR,
        });
        this.processPointer(titleMenu);
      }
    },
  };
}
