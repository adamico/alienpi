import {
  vec2,
  rgb,
  WHITE,
  UISystemPlugin,
  uiSystem,
  UIObject,
  UIText,
  UITile,
  timeReal,
  mainCanvasSize,
  Color,
  mouseWasReleased,
} from "./engine.js";

import { sprites } from "./sprites.js";
import {
  settings,
  saveSettings,
  GAME_STATES,
  strings,
} from "./config.js";
import { Menu } from "./menuNav.js";
import { FONT_MENU } from "./fonts.js";
import { formatHighScore } from "./score.js";
import { resetEconomy } from "./economy.js";
import {
  makeMenuRow,
  updateMenuInteraction,
  paintMenu,
} from "./ui/menuView.js";
import {
  buildSharedSettingsSliders,
  buildSharedSettingsRows,
  buildSharedSettingsItems,
  updateSharedSliderInput,
} from "./ui/settingsShared.js";
import { createLoreScreen, createCreditsScreen } from "./ui/storyScreens.js";
import { createHudView } from "./ui/hudView.js";
import { createEconomyScreens } from "./ui/economyScreens.js";

let uiStateProvider = null;

let uiRoot;
let hudView;
let economyScreens;
let hudGroup,
  titleGroup,
  pauseGroup,
  gameOverGroup,
  preRunGroup,
  settingsGroup,
  creditsGroup,
  loreGroup;
let titleBossDecor;
let titleInitialTexts = [];
let controlGroup, controlsTitle, controlsBody;
let titleMenuRows = [];
let pauseTitleText,
  pauseMusicSlider,
  pauseSfxSlider,
  pauseMenuRows = [];
let settingsTitle,
  settingsMusicSlider,
  settingsSfxSlider,
  settingsMenuRows = [];
let titleHighScoreText;
let socialIcons = [];

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
function measureTextWidth(text, pxHeight, font) {
  measureCtx.font = `${pxHeight}px ${font}`;
  return measureCtx.measureText(text).width;
}

const FOCUS_COLOR = rgb(1, 0.9, 0.3);
const IDLE_COLOR = WHITE;

export const titleMenu = new Menu();
export const pauseMenu = new Menu();
export const settingsMenu = new Menu();

// Menu action callbacks are wired in by game.js so ui.js stays free of state mutation.
let titleHandlers = {
  start: () => {},
  openSettings: () => {},
  openCredits: () => {},
};
let creditsHandlers = {
  back: () => {},
};
let pauseHandlers = {
  resume: () => {},
};
let settingsHandlers = {
  back: () => {},
};
let loreHandlers = {
  start: () => {},
};

export function setMenuHandlers({
  title,
  pause,
  settings: settingsH,
  credits,
  lore,
}) {
  if (title) titleHandlers = { ...titleHandlers, ...title };
  if (pause) pauseHandlers = { ...pauseHandlers, ...pause };
  if (settingsH) settingsHandlers = { ...settingsHandlers, ...settingsH };
  if (credits) creditsHandlers = { ...creditsHandlers, ...credits };
  if (lore) loreHandlers = { ...loreHandlers, ...lore };
}

function makeRow(parent, y, h = 40) {
  return makeMenuRow(parent, y, h);
}

export function initUI({ getUIState }) {
  uiStateProvider = getUIState;
  new UISystemPlugin();
  uiSystem.nativeHeight = 0;

  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  // HUD
  hudView = createHudView(uiRoot);
  hudGroup = hudView.root;

  setupTitleScreen();
  setupPauseScreen();
  setupSettingsScreen();
  setupCreditsScreen();
  setupLoreScreen();
  economyScreens = createEconomyScreens(uiRoot);
  preRunGroup = economyScreens.homeGroup;
  gameOverGroup = economyScreens.postRunGroup;
  rebuildMenus();
}

// Lays out a title with the first letter of each word styled larger and
// in an accent color. Pieces are absolute-positioned inside `parent` based
// on canvas-pixel widths measured against FONT_MENU so the result stays
// centered horizontally at `y`.
const TITLE_INITIAL_HEIGHT = 100;
const TITLE_REST_HEIGHT = 64;
const TITLE_INITIAL_COLORS = [
  rgb(1, 0.4, 0.5), // ALIEN — pink/red
  rgb(0.4, 0.9, 1), // ORBIT — cyan
  rgb(1, 0.85, 0.3), // ASSAULT — gold
];

function buildSegmentedTitle(parent, title, y, opts = {}) {
  const { offset = vec2(0, 0), glowTint = null } = opts;
  if (!glowTint) titleInitialTexts = [];
  const words = title.split(/\s+/);
  const spaceWidth = TITLE_REST_HEIGHT * 0.45;

  // Measure full layout width first to compute a centered start x.
  let totalWidth = 0;
  const measured = words.map((w) => {
    const initial = w.slice(0, 1);
    const rest = w.slice(1);
    const wInitial = measureTextWidth(initial, TITLE_INITIAL_HEIGHT, FONT_MENU);
    const wRest = rest
      ? measureTextWidth(rest, TITLE_REST_HEIGHT, FONT_MENU)
      : 0;
    totalWidth += wInitial + wRest;
    return { initial, rest, wInitial, wRest };
  });
  totalWidth += spaceWidth * (words.length - 1);

  let cursor = -totalWidth / 2;
  measured.forEach((seg, i) => {
    // Initial: positioned by its left edge -> center pos = cursor + width/2.
    const initX = cursor + seg.wInitial / 2;
    const initial = new UIText(
      vec2(initX + offset.x, y + offset.y),
      vec2(seg.wInitial + 20, TITLE_INITIAL_HEIGHT + 20),
      seg.initial,
    );
    initial.textHeight = TITLE_INITIAL_HEIGHT;
    initial.font = FONT_MENU;
    initial.fontShadow = !glowTint;
    const accent =
      glowTint || TITLE_INITIAL_COLORS[i % TITLE_INITIAL_COLORS.length];
    initial.textColor = accent.copy();
    if (!glowTint) {
      initial._baseColor = accent.copy();
      titleInitialTexts.push(initial);
    }
    parent.addChild(initial);
    cursor += seg.wInitial;

    if (seg.rest) {
      const restX = cursor + seg.wRest / 2;
      // Slight downward nudge so optical baselines line up with the bigger
      // initial letter (top-aligned looks lopsided otherwise).
      const restY = y + (TITLE_INITIAL_HEIGHT - TITLE_REST_HEIGHT) / 2;
      const rest = new UIText(
        vec2(restX + offset.x, restY + offset.y),
        vec2(seg.wRest + 20, TITLE_REST_HEIGHT + 20),
        seg.rest,
      );
      rest.textHeight = TITLE_REST_HEIGHT;
      rest.font = FONT_MENU;
      rest.fontShadow = !glowTint;
      rest.textColor = (glowTint || WHITE).copy();
      parent.addChild(rest);
      cursor += seg.wRest;
    }
    cursor += spaceWidth;
  });
}

function setupTitleScreen() {
  titleGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  // Thinner overlay so the starfield reads through behind the menu.
  titleGroup.color = new Color(0, 0, 0.08, 0.35);
  titleGroup.lineWidth = 0;
  uiRoot.addChild(titleGroup);

  // Big faded boss sprite as a backdrop, sits behind everything else.
  const bossSprite = sprites.get("boss2.png");
  if (bossSprite) {
    titleBossDecor = new UITile(vec2(0, -40), vec2(420, 420), bossSprite);
    titleBossDecor.color = new Color(1, 0.4, 0.4, 0.18);
    titleGroup.addChild(titleBossDecor);
  }

  // Word-by-word render with a two-pass chromatic glow behind the bright
  // text. The initial letter of each word is bigger and recolored; the rest
  // stays white. The glow passes share the same layout but use a uniform
  // tint so the shimmer reads as one coherent halo.
  buildSegmentedTitle(titleGroup, strings.ui.title, -200, {
    offset: vec2(-3, 2),
    glowTint: new Color(1, 0.2, 0.5, 0.45),
  });
  buildSegmentedTitle(titleGroup, strings.ui.title, -200, {
    offset: vec2(3, -2),
    glowTint: new Color(0.2, 0.8, 1, 0.45),
  });
  buildSegmentedTitle(titleGroup, strings.ui.title, -200);

  controlGroup = new UIObject(vec2(0, -30), vec2(600, 160));
  controlGroup.color = new Color(0, 0, 0, 0);
  controlGroup.lineWidth = 0;
  titleGroup.addChild(controlGroup);

  controlsTitle = new UIText(
    vec2(0, -50),
    vec2(400, 30),
    strings.ui.controlsTitle,
  );
  controlsTitle.textHeight = 22;
  controlsTitle.font = FONT_MENU;
  controlsTitle.textColor = rgb(0.2, 1, 0.4);
  controlsTitle.fontShadow = true;
  controlGroup.addChild(controlsTitle);

  controlsBody = new UIText(
    vec2(0, 20),
    vec2(600, 100),
    strings.ui.controlsBody,
  );
  controlsBody.textHeight = 18;
  controlsBody.font = FONT_MENU;
  controlsBody.fontShadow = true;
  controlsBody.textColor = WHITE.copy();
  controlGroup.addChild(controlsBody);

  titleHighScoreText = new UIText(
    vec2(0, -110),
    vec2(600, 30),
    strings.ui.highScorePrefix + formatHighScore(),
  );
  titleHighScoreText.textHeight = 22;
  titleHighScoreText.font = FONT_MENU;
  titleHighScoreText.textColor = rgb(1, 0.85, 0.3);
  titleHighScoreText.fontShadow = true;
  titleGroup.addChild(titleHighScoreText);

  titleMenuRows = [
    makeRow(titleGroup, 140),
    makeRow(titleGroup, 185),
    makeRow(titleGroup, 230),
    makeRow(titleGroup, 275),
    makeRow(titleGroup, 320),
    makeRow(titleGroup, 365),
  ];

  setupSocialIcons();
}

const SOCIAL_LINKS = [
  { sprite: "discord.png", key: "discord" },
  { sprite: "github.png", key: "github" },
  { sprite: "itchio.png", key: "itch" },
  { sprite: "bluesky.png", key: "bluesky" },
];

// Keep tint white — non-white colors hit a slow per-pixel tint path
// in LittleJS's Canvas2D drawTile (getImageData + JS loop). Alpha alone
// uses globalAlpha and stays cheap.
const SOCIAL_IDLE_COLOR = new Color(1, 1, 1, 0.45);
const SOCIAL_HOVER_COLOR = new Color(1, 1, 1, 1);

function setupSocialIcons() {
  socialIcons = [];
  const iconSize = 48;
  const spacing = 64;
  const totalWidth = (SOCIAL_LINKS.length - 1) * spacing;
  const baseX = -totalWidth / 2;
  const y = 320;

  SOCIAL_LINKS.forEach((entry, i) => {
    const tile = sprites.get(entry.sprite);
    if (!tile) return;
    const aspect = tile.size.y / tile.size.x;
    const w = iconSize;
    const h = iconSize * aspect;
    const icon = new UITile(vec2(baseX + i * spacing, y), vec2(w, h), tile);
    icon.lineWidth = 0;
    icon.color = SOCIAL_IDLE_COLOR;
    titleGroup.addChild(icon);
    socialIcons.push({ icon, key: entry.key, hovered: false });
  });
}

function setupLoreScreen() {
  loreGroup = createLoreScreen({ uiRoot, mainCanvasSize, strings }).loreGroup;
}

function setupCreditsScreen() {
  creditsGroup = createCreditsScreen({
    uiRoot,
    mainCanvasSize,
    strings,
  }).creditsGroup;
}

function setupPauseScreen() {
  pauseGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  pauseGroup.color = new Color(0, 0, 0, 0.5);
  pauseGroup.lineWidth = 0;
  uiRoot.addChild(pauseGroup);

  // Pause uses the same layout as settings — a full-canvas dark overlay so
  // the shared row Y-positions land in the same place on both screens.
  pauseTitleText = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.pauseTitle,
  );
  pauseTitleText.textHeight = 70;
  pauseTitleText.font = FONT_MENU;
  pauseTitleText.fontShadow = true;
  pauseTitleText.textColor = rgb(0.4, 0.7, 1);
  pauseGroup.addChild(pauseTitleText);

  const sliders = buildSharedSettingsSliders(pauseGroup);
  pauseMusicSlider = sliders.music;
  pauseSfxSlider = sliders.sfx;

  pauseMenuRows = buildSharedSettingsRows(pauseGroup, makeRow);
}

function setupSettingsScreen() {
  settingsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  settingsGroup.color = new Color(0.05, 0.05, 0.1, 0.9);
  settingsGroup.lineWidth = 0;
  uiRoot.addChild(settingsGroup);

  settingsTitle = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.settingsTitle,
  );
  settingsTitle.textHeight = 70;
  settingsTitle.font = FONT_MENU;
  settingsTitle.fontShadow = true;
  settingsTitle.textColor = rgb(1, 0.8, 0.2);
  settingsGroup.addChild(settingsTitle);

  const sliders = buildSharedSettingsSliders(settingsGroup);
  settingsMusicSlider = sliders.music;
  settingsSfxSlider = sliders.sfx;

  settingsMenuRows = buildSharedSettingsRows(settingsGroup, makeRow);
  // Extra row for the "RESET PROGRESS" item — only the settings menu uses it.
  settingsMenuRows.push(makeRow(settingsGroup, 220));
}

function openLink(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

// Reflects the on/off state into all volume sliders: forced to 0 when disabled,
// restored to the saved volume when re-enabled. Called from toggle handlers and
// per-frame so mouse drags while disabled can't leak into settings.
function syncVolumeSliders() {
  const music = settings.musicEnabled ? settings.musicVolume : 0;
  const sfx = settings.soundEffectsEnabled ? settings.sfxVolume : 0;
  if (pauseMusicSlider) pauseMusicSlider.value = music;
  if (pauseSfxSlider) pauseSfxSlider.value = sfx;
  if (settingsMusicSlider) settingsMusicSlider.value = music;
  if (settingsSfxSlider) settingsSfxSlider.value = sfx;
}

function rebuildMenus() {
  // const links = strings.ui.links;
  // Title menu
  titleMenu.setItems([
    {
      kind: "action",
      label: () => "START",
      activate: () => titleHandlers.start(),
    },
    {
      kind: "action",
      label: () => "SETTINGS",
      activate: () => titleHandlers.openSettings(),
    },
    {
      kind: "action",
      label: () => "CREDITS",
      activate: () => titleHandlers.openCredits(),
    },
    // {
    //   kind: "action",
    //   label: () => links.discord.label,
    //   activate: () => openLink(links.discord.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.github.label,
    //   activate: () => openLink(links.github.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.itch.label,
    //   activate: () => openLink(links.itch.url),
    // },
    // {
    //   kind: "action",
    //   label: () => links.bluesky.label,
    //   activate: () => openLink(links.bluesky.url),
    // },
  ]);

  const pauseSharedItems = buildSharedSettingsItems({
    musicSlider: pauseMusicSlider,
    sfxSlider: pauseSfxSlider,
    syncVolumeSliders,
  });
  pauseMenu.setItems([
    ...pauseSharedItems,
    {
      kind: "action",
      label: () => "BACK TO GAME (ESC)",
      activate: () => pauseHandlers.resume(),
    },
  ]);

  const settingsSharedItems = buildSharedSettingsItems({
    musicSlider: settingsMusicSlider,
    sfxSlider: settingsSfxSlider,
    syncVolumeSliders,
  });
  // Two-step "Reset Progress" — first press arms, second confirms within 3s.
  let resetArmedUntil = 0;
  settingsMenu.setItems([
    ...settingsSharedItems,
    {
      kind: "action",
      label: () =>
        timeReal < resetArmedUntil
          ? "PRESS AGAIN TO CONFIRM"
          : "RESET PROGRESS",
      activate: () => {
        if (timeReal < resetArmedUntil) {
          resetEconomy();
          resetArmedUntil = 0;
        } else {
          resetArmedUntil = timeReal + 3;
        }
      },
    },
    {
      kind: "action",
      label: () => "BACK",
      activate: () => settingsHandlers.back(),
    },
  ]);
}

export function updateUI() {
  if (!uiRoot) return;

  const { gameState, gameTime, gameWon, currentBoss, lastRunDebrief } =
    uiStateProvider();

  uiRoot.pos = mainCanvasSize.scale(0.5).floor();
  uiRoot.size = mainCanvasSize;

  hudGroup.size = mainCanvasSize;
  titleGroup.size = mainCanvasSize;
  loreGroup.size = mainCanvasSize;
  pauseGroup.size = mainCanvasSize;
  gameOverGroup.size = mainCanvasSize;
  preRunGroup.size = mainCanvasSize;
  settingsGroup.size = mainCanvasSize;
  creditsGroup.size = mainCanvasSize;

  hudView.setVisible(
    gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE,
  );
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  loreGroup.visible = gameState === GAME_STATES.LORE;
  preRunGroup.visible = gameState === GAME_STATES.HOME;
  gameOverGroup.visible = gameState === GAME_STATES.POST_RUN;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;
  creditsGroup.visible = gameState === GAME_STATES.CREDITS;

  if (titleGroup.visible) {
    paintMenu(titleMenu, titleMenuRows, FOCUS_COLOR, IDLE_COLOR);

    // Pulse the highlighted initial letters so the title feels alive.
    const pulse = 0.85 + 0.15 * Math.sin(timeReal * 3);
    for (const t of titleInitialTexts) {
      t.textColor = t._baseColor.copy();
      t.textColor.a *= pulse;
    }
  }

  if (settingsGroup.visible) {
    updateSharedSliderInput(settingsMusicSlider, settingsSfxSlider);
    paintMenu(settingsMenu, settingsMenuRows, FOCUS_COLOR, IDLE_COLOR);
  }

  if (pauseGroup.visible) {
    updateSharedSliderInput(pauseMusicSlider, pauseSfxSlider);
    paintMenu(pauseMenu, pauseMenuRows, FOCUS_COLOR, IDLE_COLOR);
  }

  if (preRunGroup.visible) {
    economyScreens.updateHome();
  }

  economyScreens.setPostRunVisible(gameOverGroup.visible);
  if (gameOverGroup.visible) {
    economyScreens.updatePostRun({ gameWon, lastRunDebrief });
  }

  if (titleGroup.visible) {
    titleHighScoreText.text = strings.ui.highScorePrefix + formatHighScore();

    const links = strings.ui.links;
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

  if (hudGroup.visible) {
    hudView.update({ gameTime, currentBoss });
  }
}

export function processMenuPointerInput() {
  if (!uiRoot) return;

  const { gameState } = uiStateProvider();

  if (gameState === GAME_STATES.TITLE) {
    updateMenuInteraction(titleMenu, titleMenuRows);
  }

  if (gameState === GAME_STATES.SETTINGS) {
    updateMenuInteraction(settingsMenu, settingsMenuRows);
    if (
      mouseWasReleased(0) &&
      (settingsMusicSlider.isHoverObject() || settingsSfxSlider.isHoverObject())
    ) {
      saveSettings();
    }
  }

  if (gameState === GAME_STATES.PAUSE) {
    updateMenuInteraction(pauseMenu, pauseMenuRows);
    if (
      mouseWasReleased(0) &&
      (pauseMusicSlider.isHoverObject() || pauseSfxSlider.isHoverObject())
    ) {
      saveSettings();
    }
  }
}
