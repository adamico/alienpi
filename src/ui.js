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
  cameraScale,
  Color,
  UISlider,
  mouseWasPressed,
  mouseWasReleased,
  toggleFullscreen,
  isFullscreen,
} from "./engine.js";

import { player } from "./entities/player.js";
import { sprites } from "./sprites.js";
import { soundShoot } from "./sounds.js";
import {
  player as playerCfg,
  loot as lootCfg,
  weapons as weaponsCfg,
  system,
  settings,
  saveSettings,
  GAME_STATES,
  strings,
} from "./config.js";
import { gameState, gameTime, gameWon, currentBoss } from "../game.js";
import { Menu, adjustSetting } from "./menuNav.js";
import { drawLootCell } from "./lootIcon.js";
import { FONT_MENU } from "./fonts.js";
import { formatScore, formatHighScore } from "./score.js";
import {
  getSubstrate,
  getDebt,
  getLastRun,
  formatSubstrate,
  resetEconomy,
} from "./economy.js";
import { lastRunDebrief } from "../game.js";

let uiRoot;
let scoreText, timeText;
let healthIcons = [];
let weaponIcons = [];
let hudGroup,
  titleGroup,
  pauseGroup,
  gameOverGroup,
  preRunGroup,
  settingsGroup,
  creditsGroup,
  loreGroup;
let preRunTitleText,
  preRunBalanceText,
  preRunDebtText,
  preRunLastRunText,
  preRunLaunchText;
let postRunEarningsText,
  postRunBossBonusText,
  postRunRepairText,
  postRunNetText,
  postRunBalanceText,
  postRunDebtText;
let titleBossDecor;
let titleInitialTexts = [];
let controlGroup, controlsTitle, controlsBody;
let creditsTitleText, creditsBodyText, creditsBackText;
let loreTitleText, loreBodyText, loreStartText;
let bossHealthGroup, bossHealthBg, bossHealthFg;
let titleMenuRows = [];
let pauseTitleText,
  pauseMusicSlider,
  pauseSfxSlider,
  pauseMenuRows = [];
let settingsTitle,
  settingsMusicSlider,
  settingsSfxSlider,
  settingsMenuRows = [];
let retryText, gameOverTitleText, backToTitleText, finalScoreText;
let gameOverHighScoreText, titleHighScoreText, hudHighScoreText;
let socialIcons = [];
let postRunCacheWon = null;
let postRunCacheBalance = NaN;
let postRunCacheEarnings = NaN;
let postRunCacheBossBonus = NaN;
let postRunCacheRepair = NaN;
let postRunCacheNet = NaN;
let postRunCacheDebt = NaN;
let postRunCacheHasDebrief = null;

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];
const WEAPON_LOOT_MAPPING = {
  vulcan: "blue",
  shotgun: "red",
  latch: "green",
};

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
function measureTextWidth(text, pxHeight, font) {
  measureCtx.font = `${pxHeight}px ${font}`;
  return measureCtx.measureText(text).width;
}

const BOSS_BAR = {
  padding: 40, // top margin and left/right margin from canvas edge
  height: 32, // outer bar height
  border: 2, // bg border line width
  fgInset: 4, // gap between bg edge and fg edge (framed look)
  revealDuration: 0.6, // seconds for scale + flash reveal
};
let bossBarRevealStartT = null;

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
  const row = new UIObject(vec2(0, y), vec2(800, h));
  row.color = new Color(0, 0, 0, 0);
  row.lineWidth = 0;
  parent.addChild(row);
  const text = new UIText(vec2(0, 0), vec2(800, h), "");
  text.textHeight = 30;
  text.fontShadow = true;
  text.font = FONT_MENU;
  row.addChild(text);
  const cursor = new UIText(vec2(-260, 0), vec2(40, h), "");
  cursor.textHeight = 30;
  cursor.fontShadow = true;
  cursor.font = FONT_MENU;
  row.addChild(cursor);
  return { row, text, cursor };
}

export function initUI() {
  new UISystemPlugin();
  uiSystem.nativeHeight = 0;

  uiRoot = new UIObject(mainCanvasSize.scale(0.5).floor(), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  // HUD
  hudGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  hudGroup.color = new Color(0, 0, 0, 0);
  hudGroup.lineWidth = 0;
  uiRoot.addChild(hudGroup);

  scoreText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.substratePrefix + "0",
  );
  scoreText.textColor = rgb(0.4, 1, 0.7);
  scoreText.textAlign = "left";
  scoreText.fontShadow = true;
  hudGroup.addChild(scoreText);

  hudHighScoreText = new UIText(
    vec2(0, 0),
    vec2(300, 24),
    strings.ui.debtPrefix + "0",
  );
  hudHighScoreText.textColor = new Color(1, 0.5, 0.3, 0.85);
  hudHighScoreText.textAlign = "left";
  hudHighScoreText.fontShadow = true;
  hudGroup.addChild(hudHighScoreText);

  timeText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.timePrefix + "00:00",
  );
  timeText.textColor = WHITE.copy();
  timeText.textAlign = "right";
  timeText.fontShadow = true;
  hudGroup.addChild(timeText);

  setupHealthUI();
  setupWeaponUI();

  // Boss Health Bar — actual size set per-frame in updateBossHealthBar.
  bossHealthGroup = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthGroup.color = new Color(0, 0, 0, 0);
  bossHealthGroup.lineWidth = 0;
  hudGroup.addChild(bossHealthGroup);

  bossHealthBg = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthBg.lineWidth = BOSS_BAR.border;
  bossHealthGroup.addChild(bossHealthBg);

  bossHealthFg = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthFg.lineWidth = 0;
  bossHealthBg.addChild(bossHealthFg);

  setupTitleScreen();
  setupPauseScreen();
  setupGameOverScreen();
  setupSettingsScreen();
  setupCreditsScreen();
  setupLoreScreen();
  setupPreRunScreen();
  extendPostRunScreen();
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
  loreGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  loreGroup.color = new Color(0.02, 0.02, 0.08, 0.85);
  loreGroup.lineWidth = 0;
  uiRoot.addChild(loreGroup);

  loreTitleText = new UIText(
    vec2(0, -270),
    vec2(800, 100),
    strings.ui.loreTitle,
  );
  loreTitleText.textHeight = 70;
  loreTitleText.font = FONT_MENU;
  loreTitleText.fontShadow = true;
  loreTitleText.textColor = rgb(1, 0.8, 0.2);
  loreGroup.addChild(loreTitleText);

  loreBodyText = new UIText(vec2(0, 0), vec2(900, 420), strings.ui.loreBody);
  loreBodyText.textHeight = 22;
  loreBodyText.font = FONT_MENU;
  loreBodyText.textColor = WHITE.copy();
  loreBodyText.fontShadow = true;
  loreGroup.addChild(loreBodyText);

  loreStartText = new UIText(
    vec2(0, 280),
    vec2(800, 40),
    strings.ui.loreStartPrompt,
  );
  loreStartText.textHeight = 20;
  loreStartText.font = FONT_MENU;
  loreStartText.textColor = WHITE.copy();
  loreStartText.fontShadow = true;
  loreGroup.addChild(loreStartText);
}

function setupCreditsScreen() {
  creditsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  creditsGroup.color = new Color(0.02, 0.02, 0.08, 0.85);
  creditsGroup.lineWidth = 0;
  uiRoot.addChild(creditsGroup);

  creditsTitleText = new UIText(
    vec2(0, -260),
    vec2(800, 100),
    strings.ui.creditsTitle,
  );
  creditsTitleText.textHeight = 70;
  creditsTitleText.font = FONT_MENU;
  creditsTitleText.fontShadow = true;
  creditsTitleText.textColor = rgb(1, 0.8, 0.2);
  creditsGroup.addChild(creditsTitleText);

  creditsBodyText = new UIText(
    vec2(0, 0),
    vec2(900, 420),
    strings.ui.creditsBody,
  );
  creditsBodyText.textHeight = 22;
  creditsBodyText.font = FONT_MENU;
  creditsBodyText.textColor = WHITE.copy();
  creditsBodyText.fontShadow = true;
  creditsGroup.addChild(creditsBodyText);

  creditsBackText = new UIText(
    vec2(0, 280),
    vec2(800, 40),
    strings.ui.creditsBackPrompt,
  );
  creditsBackText.textHeight = 20;
  creditsBackText.font = FONT_MENU;
  creditsBackText.textColor = rgb(0.6, 0.9, 1);
  creditsBackText.fontShadow = true;
  creditsGroup.addChild(creditsBackText);
}

// Shared layout constants for the audio/video settings block reused by both
// the pause and settings screens. Row Y positions are relative to the
// container; sliders sit just above the corresponding "VOLUME" row.
const SETTINGS_ROW_YS = [-180, -150, -80, -50, 30, 80, 130, 180];
const SETTINGS_MUSIC_SLIDER_Y = -120;
const SETTINGS_SFX_SLIDER_Y = -20;

function buildSharedSettingsSliders(parent) {
  const music = new UISlider(
    vec2(0, SETTINGS_MUSIC_SLIDER_Y),
    vec2(380, 18),
    settings.musicVolume,
  );
  music.color = rgb(0.4, 0.7, 1);
  parent.addChild(music);
  const sfx = new UISlider(
    vec2(0, SETTINGS_SFX_SLIDER_Y),
    vec2(380, 18),
    settings.sfxVolume,
  );
  sfx.color = rgb(0.2, 1, 0.2);
  parent.addChild(sfx);
  return { music, sfx };
}

function buildSharedSettingsRows(parent) {
  return SETTINGS_ROW_YS.map((y) => makeRow(parent, y));
}

// Returns the 7 shared audio/video items used by both menus. The local sliders
// are passed in so keyboard adjusts can update the matching screen's visual.
function buildSharedSettingsItems({ musicSlider, sfxSlider }) {
  return [
    {
      kind: "toggle",
      label: () =>
        `MUSIC: ${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.musicEnabled = !settings.musicEnabled;
        syncVolumeSliders();
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `MUSIC VOLUME: ${Math.round(settings.musicVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "musicVolume", dir);
        musicSlider.value = settings.musicVolume;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SFX: ${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.soundEffectsEnabled = !settings.soundEffectsEnabled;
        syncVolumeSliders();
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `SFX VOLUME: ${Math.round(settings.sfxVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "sfxVolume", dir);
        sfxSlider.value = settings.sfxVolume;
        soundShoot.play();
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `FLASH EFFECTS: ${settings.flashEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.flashEnabled = !settings.flashEnabled;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SCREEN SHAKE: ${settings.shakeEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.shakeEnabled = !settings.shakeEnabled;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `FULLSCREEN: ${isFullscreen() ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => toggleFullscreen(),
    },
  ];
}

// Mouse-drag → settings sync (and 0-pin while disabled) for either screen.
function updateSharedSliderInput(musicSlider, sfxSlider) {
  if (!settings.musicEnabled) {
    musicSlider.value = 0;
  } else if (musicSlider.value !== settings.musicVolume) {
    settings.musicVolume = musicSlider.value;
  }
  if (!settings.soundEffectsEnabled) {
    sfxSlider.value = 0;
  } else if (sfxSlider.value !== settings.sfxVolume) {
    settings.sfxVolume = sfxSlider.value;
    soundShoot.play();
  }
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

  pauseMenuRows = buildSharedSettingsRows(pauseGroup);
}

function setupGameOverScreen() {
  gameOverGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  gameOverGroup.color = new Color(0, 0, 0, 0);
  gameOverGroup.lineWidth = 0;
  uiRoot.addChild(gameOverGroup);

  gameOverTitleText = new UIText(
    vec2(0, -90),
    vec2(800, 100),
    strings.ui.gameOverTitle,
  );
  gameOverTitleText.textHeight = 80;
  gameOverTitleText.font = FONT_MENU;
  gameOverTitleText.textColor = rgb(1, 0.2, 0.2);
  gameOverTitleText.fontShadow = false;
  gameOverGroup.addChild(gameOverTitleText);

  retryText = new UIText(vec2(0, 60), vec2(800, 50), strings.ui.retryPrompt);
  retryText.textHeight = 24;
  retryText.font = FONT_MENU;
  retryText.textColor = WHITE.copy();
  retryText.fontShadow = false;

  // Hidden after the HOME hub took over the post-run exit; kept for layout
  // continuity but rendered invisible to avoid a stray "ESC: TITLE" prompt
  // on the debrief screen.
  backToTitleText = new UIText(vec2(0, 100), vec2(800, 40), "");
  backToTitleText.textHeight = 18;
  backToTitleText.font = FONT_MENU;
  backToTitleText.textColor = new Color(0.7, 0.7, 0.7, 1);
  backToTitleText.fontShadow = false;
  backToTitleText.visible = false;

  finalScoreText = new UIText(
    vec2(0, 0),
    vec2(800, 100),
    strings.ui.finalScorePrefix + formatScore(),
  );
  finalScoreText.textHeight = 60;
  finalScoreText.font = FONT_MENU;
  finalScoreText.textColor = rgb(1, 1, 1);
  finalScoreText.fontShadow = false;

  gameOverHighScoreText = new UIText(
    vec2(0, 35),
    vec2(800, 40),
    strings.ui.highScorePrefix + formatHighScore(),
  );
  gameOverHighScoreText.textHeight = 26;
  gameOverHighScoreText.font = FONT_MENU;
  gameOverHighScoreText.textColor = rgb(1, 0.85, 0.3);
  gameOverHighScoreText.fontShadow = false;

  gameOverGroup.addChild(finalScoreText);
  gameOverGroup.addChild(gameOverHighScoreText);
  gameOverGroup.addChild(retryText);
  gameOverGroup.addChild(backToTitleText);
}

function makeDebriefLine(parent, y, label, color = WHITE) {
  const t = new UIText(vec2(0, y), vec2(800, 32), label);
  t.textHeight = 24;
  t.font = FONT_MENU;
  t.textColor = color.copy();
  t.fontShadow = true;
  parent.addChild(t);
  return t;
}

function setupPreRunScreen() {
  preRunGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  preRunGroup.color = new Color(0.04, 0.06, 0.12, 0.85);
  preRunGroup.lineWidth = 0;
  uiRoot.addChild(preRunGroup);

  preRunTitleText = new UIText(
    vec2(0, -160),
    vec2(800, 100),
    strings.ui.homeTitle,
  );
  preRunTitleText.textHeight = 70;
  preRunTitleText.font = FONT_MENU;
  preRunTitleText.textColor = rgb(0.4, 0.9, 1);
  preRunTitleText.fontShadow = true;
  preRunGroup.addChild(preRunTitleText);

  preRunBalanceText = makeDebriefLine(
    preRunGroup,
    -40,
    strings.ui.homeBalanceLabel,
    rgb(0.4, 1, 0.7),
  );
  preRunDebtText = makeDebriefLine(
    preRunGroup,
    0,
    strings.ui.homeDebtLabel,
    rgb(1, 0.5, 0.3),
  );
  preRunLastRunText = makeDebriefLine(
    preRunGroup,
    40,
    strings.ui.homeLastRunLabel,
    new Color(0.85, 0.85, 0.85, 1),
  );

  preRunLaunchText = new UIText(
    vec2(0, 130),
    vec2(800, 50),
    strings.ui.homeLaunchPrompt,
  );
  preRunLaunchText.textHeight = 28;
  preRunLaunchText.font = FONT_MENU;
  preRunLaunchText.textColor = WHITE.copy();
  preRunLaunchText.fontShadow = true;
  preRunGroup.addChild(preRunLaunchText);

  const homeExitText = new UIText(
    vec2(0, 180),
    vec2(800, 32),
    strings.ui.homeExitPrompt,
  );
  homeExitText.textHeight = 18;
  homeExitText.font = FONT_MENU;
  homeExitText.textColor = new Color(0.7, 0.7, 0.7, 1);
  homeExitText.fontShadow = true;
  preRunGroup.addChild(homeExitText);
}

// Adds debrief breakdown rows to the existing gameOverGroup (now POST_RUN).
function extendPostRunScreen() {
  postRunEarningsText = makeDebriefLine(gameOverGroup, 80, "");
  postRunEarningsText.fontShadow = false;
  postRunBossBonusText = makeDebriefLine(
    gameOverGroup,
    110,
    "",
    rgb(1, 0.85, 0.3),
  );
  postRunBossBonusText.fontShadow = false;
  postRunRepairText = makeDebriefLine(gameOverGroup, 140, "", rgb(1, 0.5, 0.3));
  postRunRepairText.fontShadow = false;
  postRunNetText = makeDebriefLine(gameOverGroup, 175, "", rgb(0.4, 1, 0.7));
  postRunNetText.fontShadow = false;
  postRunNetText.textHeight = 28;
  postRunBalanceText = makeDebriefLine(
    gameOverGroup,
    215,
    "",
    rgb(0.4, 1, 0.7),
  );
  postRunBalanceText.fontShadow = false;
  postRunDebtText = makeDebriefLine(gameOverGroup, 245, "", rgb(1, 0.5, 0.3));
  postRunDebtText.fontShadow = false;
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

  settingsMenuRows = buildSharedSettingsRows(settingsGroup);
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

/**
 * Processes mouse/touch interaction for a Menu and its corresponding UI rows.
 * @param {Menu} menu
 * @param {Array} rows - Objects with {row: UIObject}
 */
function updateMenuInteraction(menu, rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.row.visible) continue;

    // Use overlapping check which is more reliable for touch than top-most hover
    if (row.row.isMouseOverlapping()) {
      if (menu.focusedIndex !== i) {
        menu.focusedIndex = i;
      }

      // Check for both press and release to catch touch events reliably
      if (mouseWasPressed(0) || mouseWasReleased(0)) {
        const item = menu.items[i];
        if (item) {
          if (item.kind === "action") item.activate?.();
          else if (item.kind === "toggle") item.toggle?.();
          // Slider kind: focus is enough, they use UISlider for actual dragging
          return true;
        }
      }
    }
  }
  return false;
}

function updateBossHealthBar(uiCenterY, hudScale) {
  const visible =
    currentBoss && !currentBoss.destroyed && currentBoss.state !== "entering";
  if (!visible) {
    bossHealthGroup.visible = false;
    bossBarRevealStartT = null;
    return;
  }
  if (bossBarRevealStartT === null) bossBarRevealStartT = timeReal;
  bossHealthGroup.visible = true;

  const elapsed = timeReal - bossBarRevealStartT;
  const t = Math.min(1, elapsed / BOSS_BAR.revealDuration);
  const ease = t * t * (3 - 2 * t); // smoothstep
  const flash = 1 - ease; // 1 = fully white, 0 = final color

  // Position: top of canvas + padding, centered horizontally.
  const yOffset = BOSS_BAR.padding + BOSS_BAR.height / 2;
  bossHealthGroup.localPos = vec2(0, -uiCenterY + yOffset * hudScale);

  // Background: bar fits inside the playfield with `padding` from each
  // playfield edge (i.e. side padding includes the marquee band), scaled by
  // the reveal animation.
  const playfieldWidth = system.levelSize.x * cameraScale;
  const marqueeWidth = (mainCanvasSize.x - playfieldWidth) / 2;
  const fullBgWidth =
    mainCanvasSize.x - (marqueeWidth + BOSS_BAR.padding * hudScale) * 2;
  const bgWidth = fullBgWidth * ease;
  bossHealthBg.size = vec2(bgWidth, BOSS_BAR.height * hudScale);

  // Foreground: insets within bg, width tracks current HP.
  const hpPercent = Math.max(0, currentBoss.hp / currentBoss.maxHp);
  const fgMaxWidth = (fullBgWidth - BOSS_BAR.fgInset * 2 * hudScale) * ease;
  const fgWidth = fgMaxWidth * hpPercent;
  bossHealthFg.size = vec2(
    fgWidth,
    (BOSS_BAR.height - BOSS_BAR.fgInset * 2) * hudScale,
  );
  bossHealthFg.localPos = vec2(-(fgMaxWidth - fgWidth) / 2, 0);

  // Color flash: white → final colors as the reveal completes.
  bossHealthBg.color = new Color(0.2 + 0.8 * flash, flash, flash, 0.7);
  bossHealthBg.lineColor = new Color(1, flash, flash);
  bossHealthFg.color = new Color(1, 0.2 + 0.8 * flash, 0.2 + 0.8 * flash);
}

function paintMenu(menu, rows, focusColor, idleColor) {
  for (let i = 0; i < rows.length; i++) {
    const item = menu.items[i];
    const row = rows[i];
    if (!item) {
      row.text.text = "";
      row.cursor.text = "";
      row.row.visible = false;
      continue;
    }
    row.row.visible = true;
    const focused = menu.focusedIndex === i;
    const label = item.label();
    row.text.text = label;
    row.text.textColor = focused ? focusColor.copy() : idleColor.copy();
    row.cursor.text = focused ? ">" : "";
    row.cursor.textColor = focusColor.copy();
    if (focused) {
      const labelWidth = measureTextWidth(
        label,
        row.text.textHeight,
        row.text.font,
      );
      const gap = row.text.textHeight * 0.4;
      row.cursor.localPos = vec2(-labelWidth / 2 - gap, 0);
    }
  }
}

function setupHealthUI() {
  const heartSprite = sprites.get(playerCfg.hpIcon, playerCfg.hpIconSheet);
  for (let i = 0; i < playerCfg.hp; i++) {
    const icon = new UITile(vec2(0, 0), vec2(37, 26).scale(0.8), heartSprite);
    icon.color = WHITE.copy();
    hudGroup.addChild(icon);
    healthIcons.push(icon);
  }
}

const PIP_FILLED = "■"; // ■
const PIP_EMPTY = "□"; // □

// Icon dimensions that match the loot entity's native aspect ratio so
// drawLootCell renders identically in the HUD and in the playfield.
const LOOT_ICON_H = 26; // target height in UI pixels
const LOOT_ICON_W = Math.round(LOOT_ICON_H * (lootCfg.size.x / lootCfg.size.y));

function setupWeaponUI() {
  WEAPON_ORDER.forEach((key, i) => {
    const lootKey = WEAPON_LOOT_MAPPING[key];
    const typeCfg = lootCfg.types[lootKey];

    const container = new UIObject(vec2(0, 0), vec2(220, 44));
    container.color = new Color(0, 0, 0, 0);
    container.lineWidth = 0;
    container.cornerRadius = 6;
    hudGroup.addChild(container);

    const icon = new UIObject(vec2(-85, 0), vec2(LOOT_ICON_W, LOOT_ICON_H));
    icon.color = new Color(0, 0, 0, 0); // transparent — onRender draws the hex
    icon.lineWidth = 0;
    icon.cornerRadius = 0;
    icon._alpha = 1.0; // controlled per-frame in updateUI
    icon.onRender = function () {
      // Delegate entirely to drawLootCell — same code path as the in-world
      // loot entity so aspect/proportions always match.
      // Build a fresh color each frame to pick up the alpha set in updateUI.
      const c = typeCfg.color.copy();
      c.a *= this._alpha;
      drawLootCell(this.pos, this.size, c, typeCfg.letter, true);
    };
    container.addChild(icon);

    const nameText = new UIText(vec2(-50, 0), vec2(110, 28), "", "left");
    nameText.textHeight = 16;
    nameText.font = FONT_MENU;
    nameText.fontShadow = true;
    container.addChild(nameText);

    const pipsText = new UIText(vec2(85, 0), vec2(70, 28), "", "right");
    pipsText.textHeight = 16;
    pipsText.font = FONT_MENU;
    pipsText.fontShadow = true;
    container.addChild(pipsText);

    weaponIcons.push({
      key,
      container,
      icon,
      nameText,
      pipsText,
      index: i,
      typeCfg,
    });
  });
}

export function updateUI() {
  if (!uiRoot) return;

  const hudScale = mainCanvasSize.y / 720;

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

  hudGroup.visible =
    gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE;
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  loreGroup.visible = gameState === GAME_STATES.LORE;
  preRunGroup.visible = gameState === GAME_STATES.HOME;
  gameOverGroup.visible = gameState === GAME_STATES.POST_RUN;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;
  creditsGroup.visible = gameState === GAME_STATES.CREDITS;

  if (!gameOverGroup.visible) {
    postRunCacheWon = null;
    postRunCacheBalance = NaN;
    postRunCacheEarnings = NaN;
    postRunCacheBossBonus = NaN;
    postRunCacheRepair = NaN;
    postRunCacheNet = NaN;
    postRunCacheDebt = NaN;
    postRunCacheHasDebrief = null;
  }

  if (titleGroup.visible) {
    updateMenuInteraction(titleMenu, titleMenuRows);
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
    updateMenuInteraction(settingsMenu, settingsMenuRows);
    paintMenu(settingsMenu, settingsMenuRows, FOCUS_COLOR, IDLE_COLOR);

    if (mouseWasReleased(0)) {
      if (
        settingsMusicSlider.isHoverObject() ||
        settingsSfxSlider.isHoverObject()
      )
        saveSettings();
    }
  }

  if (pauseGroup.visible) {
    updateSharedSliderInput(pauseMusicSlider, pauseSfxSlider);
    updateMenuInteraction(pauseMenu, pauseMenuRows);
    paintMenu(pauseMenu, pauseMenuRows, FOCUS_COLOR, IDLE_COLOR);

    if (mouseWasReleased(0)) {
      if (pauseMusicSlider.isHoverObject() || pauseSfxSlider.isHoverObject())
        saveSettings();
    }
  }

  if (preRunGroup.visible) {
    preRunBalanceText.text =
      strings.ui.homeBalanceLabel +
      ": " +
      formatSubstrate(getSubstrate(), { compact: false });
    preRunDebtText.text =
      strings.ui.homeDebtLabel +
      ": " +
      formatSubstrate(getDebt(), { compact: false });
    preRunDebtText.visible = getDebt() > 0;
    const last = getLastRun();
    preRunLastRunText.visible = !!last;
    if (last) {
      const sign = last.net >= 0 ? "+" : "";
      preRunLastRunText.text =
        strings.ui.homeLastRunLabel +
        ": " +
        sign +
        formatSubstrate(last.net, { compact: false });
      preRunLastRunText.textColor =
        last.net >= 0 ? new Color(0.4, 1, 0.7, 1) : new Color(1, 0.5, 0.3, 1);
    }
    preRunLaunchText.visible = (timeReal * 2) % 2 < 1.2;
  }

  if (gameOverGroup.visible) {
    const d = lastRunDebrief;
    const hasDebrief = !!d;
    const balanceForHeadline = d ? d.balance : getSubstrate();
    const earnings = d ? d.earnings : NaN;
    const bossBonus = d ? d.bossBonus : NaN;
    const repair = d ? d.repair : NaN;
    const net = d ? d.net : NaN;
    const debt = d ? d.debt : NaN;
    const shouldRefresh =
      postRunCacheWon !== gameWon ||
      postRunCacheHasDebrief !== hasDebrief ||
      postRunCacheBalance !== balanceForHeadline ||
      postRunCacheEarnings !== earnings ||
      postRunCacheBossBonus !== bossBonus ||
      postRunCacheRepair !== repair ||
      postRunCacheNet !== net ||
      postRunCacheDebt !== debt;

    if (shouldRefresh) {
      postRunCacheWon = gameWon;
      postRunCacheHasDebrief = hasDebrief;
      postRunCacheBalance = balanceForHeadline;
      postRunCacheEarnings = earnings;
      postRunCacheBossBonus = bossBonus;
      postRunCacheRepair = repair;
      postRunCacheNet = net;
      postRunCacheDebt = debt;

      if (gameWon) {
        gameOverTitleText.text = strings.ui.postRunVictoryTitle;
        gameOverTitleText.textColor = rgb(0.4, 1, 0.4);
      } else {
        gameOverTitleText.text = strings.ui.postRunDefeatTitle;
        gameOverTitleText.textColor = rgb(1, 0.2, 0.2);
      }
      retryText.text = strings.ui.postRunContinuePrompt;

      // Headline is the post-run Substrate balance — the score row is gone in
      // favor of the economy framing.
      finalScoreText.text =
        strings.ui.postRunSubstratePrefix +
        formatSubstrate(balanceForHeadline, { compact: false });
      finalScoreText.textColor = rgb(0.4, 1, 0.7);
      gameOverHighScoreText.visible = false;

      const showBreakdown = !!d;
      postRunEarningsText.visible = showBreakdown;
      postRunBossBonusText.visible = showBreakdown && d && d.bossBonus > 0;
      postRunRepairText.visible = showBreakdown;
      postRunNetText.visible = showBreakdown;
      postRunBalanceText.visible = showBreakdown;
      postRunDebtText.visible = showBreakdown && d && d.debt > 0;
      if (d) {
        postRunEarningsText.text =
          strings.ui.postRunEarningsLabel +
          ": +" +
          formatSubstrate(d.earnings, { compact: false });
        postRunBossBonusText.text =
          strings.ui.postRunBossBonusLabel +
          ": +" +
          formatSubstrate(d.bossBonus, { compact: false });
        postRunRepairText.text =
          strings.ui.postRunRepairLabel +
          ": -" +
          formatSubstrate(d.repair, { compact: false });
        const netSign = d.net >= 0 ? "+" : "";
        postRunNetText.text =
          strings.ui.postRunNetLabel +
          ": " +
          netSign +
          formatSubstrate(d.net, { compact: false });
        postRunNetText.textColor =
          d.net >= 0 ? rgb(0.4, 1, 0.7) : rgb(1, 0.5, 0.3);
        postRunBalanceText.text =
          strings.ui.postRunBalanceLabel +
          ": " +
          formatSubstrate(d.balance, { compact: false });
        postRunDebtText.text =
          strings.ui.postRunDebtLabel +
          ": " +
          formatSubstrate(d.debt, { compact: false });
      }
    }

    // Keep the continue cue near the bottom edge so it reads as a footer hint.
    retryText.localPos = vec2(0, Math.floor(mainCanvasSize.y * 0.42));
    retryText.visible = (timeReal * 2) % 2 < 1.2;
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
    const uiCenterX = Math.floor(mainCanvasSize.x / 2);
    const uiCenterY = Math.floor(mainCanvasSize.y / 2);
    // y-margin clears the boss bar (top padding + bar height + gap) so score/time
    // sit beneath it instead of overlapping.
    const margin = vec2(125 * hudScale, 100 * hudScale);
    const uiAnchor = vec2(-uiCenterX + margin.x, -uiCenterY + margin.y);

    scoreText.localPos = vec2(uiAnchor.x, uiAnchor.y);
    scoreText.size = vec2(300, 40).scale(hudScale);
    scoreText.textHeight = 30 * hudScale;
    scoreText.text =
      strings.ui.substratePrefix + formatSubstrate(getSubstrate());

    hudHighScoreText.localPos = vec2(uiAnchor.x, uiAnchor.y + 28 * hudScale);
    hudHighScoreText.size = vec2(300, 24).scale(hudScale);
    hudHighScoreText.textHeight = 18 * hudScale;
    const debt = getDebt();
    hudHighScoreText.visible = debt > 0;
    hudHighScoreText.text = strings.ui.debtPrefix + formatSubstrate(debt);

    timeText.localPos = vec2(-uiAnchor.x, uiAnchor.y);
    timeText.size = vec2(300, 40).scale(hudScale);
    timeText.textHeight = 30 * hudScale;

    healthIcons.forEach((icon, i) => {
      icon.localPos = vec2(
        uiAnchor.x + (i - 3) * 32 * hudScale,
        uiAnchor.y + 60 * hudScale,
      );
      icon.size = vec2(37, 26).scale(0.8 * hudScale);
      if (player) {
        const alive = i < player.hp;
        icon.color = alive ? WHITE.copy() : new Color(0.7, 0.7, 0.6, 0.55);
      }
    });

    weaponIcons.forEach((item) => {
      item.container.localPos = vec2(
        uiAnchor.x,
        uiAnchor.y + 150 * hudScale + item.index * 54 * hudScale,
      );
      item.container.size = vec2(235, 44).scale(hudScale);
      item.icon.size = vec2(LOOT_ICON_W, LOOT_ICON_H).scale(hudScale);
      item.icon.localPos = vec2(-80 * hudScale, 0);
      item.icon.cornerRadius = 0;
      item.nameText.localPos = vec2(-35 * hudScale, 0);
      item.nameText.size = vec2(110, 28).scale(hudScale);
      item.nameText.textHeight = 16 * hudScale;
      item.pipsText.localPos = vec2(110 * hudScale, 0);
      item.pipsText.size = vec2(70, 28).scale(hudScale);
      item.pipsText.textHeight = 16 * hudScale;

      if (player) {
        const level = player.weaponLevels[item.key];
        const maxLevel = player.maxLevel;
        const active = player.currentWeaponKey === item.key;
        const cfg = weaponsCfg[item.key];
        const name = cfg && cfg.label ? cfg.label : item.key.toUpperCase();
        item.nameText.text = name;
        item.pipsText.text =
          PIP_FILLED.repeat(level) + PIP_EMPTY.repeat(maxLevel - level);

        // The icon alpha is controlled by setting a tinted color on the UIObject;
        // drawLootCell reads typeCfg.color directly so we bake the alpha into a
        // temporary overridden color via a closure-captured reference that the
        // onRender callback reads. We achieve this by storing the desired alpha on
        // the icon object itself and rebuilding the color each frame.
        if (level === 0) {
          item.container.color = new Color(0, 0, 0, 0);
          item.container.lineWidth = 0;
          item.icon._alpha = 0.2;
          item.nameText.textColor = new Color(1, 1, 1, 0.5);
          item.pipsText.textColor = new Color(1, 1, 1, 0.5);
        } else if (active) {
          item.container.color = new Color(0.2, 1, 0.2, 0.12);
          item.container.lineColor = rgb(0.3, 1, 0.3);
          item.container.lineWidth = 2;
          item.icon._alpha = 1.0;
          item.nameText.textColor = rgb(0.4, 1, 0.4);
          item.pipsText.textColor = rgb(0.4, 1, 0.4);
        } else {
          item.container.color = new Color(0, 0, 0, 0);
          item.container.lineWidth = 0;
          item.icon._alpha = 0.7;
          item.nameText.textColor = WHITE.copy();
          item.pipsText.textColor = WHITE.copy();
        }
      }
    });

    updateBossHealthBar(uiCenterY, hudScale);

    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    timeText.text = `${strings.ui.timePrefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}
