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
  BLACK,
  UISlider,
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
import { FONT_MENU } from "./fonts.js";
import { formatScore } from "./score.js";

let uiRoot;
let scoreText, timeText;
let healthIcons = [];
let weaponIcons = [];
let hudGroup, titleGroup, pauseGroup, gameOverGroup, settingsGroup;
let titleText, subtitleText, controlGroup, controlsTitle, controlsBody;
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
const FOCUS_DARK = rgb(0.05, 0.05, 0.4);
const IDLE_DARK = rgb(0.2, 0.2, 0.2);

export const titleMenu = new Menu();
export const pauseMenu = new Menu();
export const settingsMenu = new Menu();

// Menu action callbacks are wired in by game.js so ui.js stays free of state mutation.
let titleHandlers = {
  start: () => {},
  openSettings: () => {},
};
let pauseHandlers = {
  resume: () => {},
};
let settingsHandlers = {
  back: () => {},
};

export function setMenuHandlers({ title, pause, settings: settingsH }) {
  if (title) titleHandlers = { ...titleHandlers, ...title };
  if (pause) pauseHandlers = { ...pauseHandlers, ...pause };
  if (settingsH) settingsHandlers = { ...settingsHandlers, ...settingsH };
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

  uiRoot = new UIObject(mainCanvasSize.scale(0.5), mainCanvasSize);
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
    strings.ui.scorePrefix + "000000",
  );
  scoreText.textColor = WHITE.copy();
  scoreText.textAlign = "left";
  scoreText.fontShadow = true;
  hudGroup.addChild(scoreText);

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
  rebuildMenus();
}

function setupTitleScreen() {
  titleGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  titleGroup.color = new Color(0, 0, 0.1, 0.7);
  titleGroup.lineWidth = 0;
  uiRoot.addChild(titleGroup);

  titleText = new UIText(vec2(0, -200), vec2(1000, 120), strings.ui.title);
  titleText.textHeight = 100;
  titleText.fontShadow = true;
  titleText.font = FONT_MENU;
  titleText.textColor = rgb(0.4, 0.7, 1);
  titleGroup.addChild(titleText);

  subtitleText = new UIText(vec2(0, -110), vec2(1000, 40), strings.ui.subtitle);
  subtitleText.textHeight = 30;
  subtitleText.font = FONT_MENU;
  subtitleText.textColor = WHITE.copy();
  titleGroup.addChild(subtitleText);

  controlGroup = new UIObject(vec2(0, -10), vec2(600, 200));
  controlGroup.color = new Color(0, 0, 0, 0);
  controlGroup.lineWidth = 0;
  titleGroup.addChild(controlGroup);

  controlsTitle = new UIText(
    vec2(0, -60),
    vec2(400, 30),
    strings.ui.controlsTitle,
  );
  controlsTitle.textHeight = 24;
  controlsTitle.font = FONT_MENU;
  controlsTitle.textColor = rgb(0.2, 1, 0.2);
  controlGroup.addChild(controlsTitle);

  controlsBody = new UIText(
    vec2(0, 20),
    vec2(600, 100),
    strings.ui.controlsBody,
  );
  controlsBody.textHeight = 20;
  controlsBody.textColor = WHITE.copy();
  controlGroup.addChild(controlsBody);

  // Menu rows live in a vertical stack at the bottom.
  titleMenuRows = [
    makeRow(titleGroup, 130),
    makeRow(titleGroup, 175),
    makeRow(titleGroup, 230),
    makeRow(titleGroup, 270),
    makeRow(titleGroup, 310),
    makeRow(titleGroup, 350),
  ];
}

function setupPauseScreen() {
  pauseGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  pauseGroup.color = new Color(0, 0, 0, 0.5);
  pauseGroup.lineWidth = 0;
  uiRoot.addChild(pauseGroup);

  const pausePanel = new UIObject(vec2(0, 0), vec2(640, 520));
  pausePanel.color = new Color(1, 1, 1, 0.85);
  pausePanel.cornerRadius = 10;
  pauseGroup.addChild(pausePanel);

  pauseTitleText = new UIText(
    vec2(0, -200),
    vec2(500, 100),
    strings.ui.pauseTitle,
  );
  pauseTitleText.textHeight = 70;
  pauseTitleText.font = FONT_MENU;
  pauseTitleText.textColor = BLACK.copy();
  pausePanel.addChild(pauseTitleText);

  // Hidden mouse-input sliders (kept for mouse drag UX).
  pauseMusicSlider = new UISlider(
    vec2(0, -60),
    vec2(380, 18),
    settings.musicVolume,
  );
  pauseMusicSlider.color = rgb(0.4, 0.7, 1);
  pausePanel.addChild(pauseMusicSlider);

  pauseSfxSlider = new UISlider(vec2(0, 40), vec2(380, 18), settings.sfxVolume);
  pauseSfxSlider.color = rgb(0.2, 1, 0.2);
  pausePanel.addChild(pauseSfxSlider);

  pauseMenuRows = [
    makeRow(pausePanel, -130),
    makeRow(pausePanel, -90),
    makeRow(pausePanel, -30),
    makeRow(pausePanel, 10),
    makeRow(pausePanel, 70),
    makeRow(pausePanel, 130),
  ];
  // Pause menu uses dark text on light panel.
  for (const r of pauseMenuRows) r.text.textColor = IDLE_DARK.copy();
}

function setupGameOverScreen() {
  gameOverGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  gameOverGroup.color = new Color(0.2, 0, 0, 0.6);
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
  gameOverTitleText.fontShadow = true;
  gameOverGroup.addChild(gameOverTitleText);

  retryText = new UIText(vec2(0, 60), vec2(800, 50), strings.ui.retryPrompt);
  retryText.textHeight = 24;
  retryText.font = FONT_MENU;
  retryText.textColor = WHITE.copy();
  retryText.fontShadow = true;

  backToTitleText = new UIText(
    vec2(0, 100),
    vec2(800, 40),
    strings.ui.backToTitlePrompt,
  );
  backToTitleText.textHeight = 18;
  backToTitleText.font = FONT_MENU;
  backToTitleText.textColor = new Color(0.7, 0.7, 0.7, 1);
  backToTitleText.fontShadow = true;

  finalScoreText = new UIText(
    vec2(0, 0),
    vec2(800, 100),
    strings.ui.finalScorePrefix + formatScore(),
  );
  finalScoreText.textHeight = 60;
  finalScoreText.font = FONT_MENU;
  finalScoreText.textColor = rgb(1, 1, 1);
  finalScoreText.fontShadow = true;

  gameOverGroup.addChild(finalScoreText);
  gameOverGroup.addChild(retryText);
  gameOverGroup.addChild(backToTitleText);
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

  settingsMusicSlider = new UISlider(
    vec2(0, -120),
    vec2(380, 18),
    settings.musicVolume,
  );
  settingsMusicSlider.color = rgb(0.4, 0.7, 1);
  settingsGroup.addChild(settingsMusicSlider);

  settingsSfxSlider = new UISlider(
    vec2(0, -20),
    vec2(380, 18),
    settings.sfxVolume,
  );
  settingsSfxSlider.color = rgb(0.2, 1, 0.2);
  settingsGroup.addChild(settingsSfxSlider);

  settingsMenuRows = [
    makeRow(settingsGroup, -180),
    makeRow(settingsGroup, -150),
    makeRow(settingsGroup, -80),
    makeRow(settingsGroup, -50),
    makeRow(settingsGroup, 30),
    makeRow(settingsGroup, 80),
    makeRow(settingsGroup, 130),
    makeRow(settingsGroup, 180),
  ];
}

// TODO: reenable when social media links are setup
// function openLink(url) {
//   window.open(url, "_blank", "noopener,noreferrer");
// }

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

  // Pause menu (resume + audio toggles + sliders)
  pauseMenu.setItems([
    {
      kind: "action",
      label: () => "RESUME",
      activate: () => pauseHandlers.resume(),
    },
    {
      kind: "toggle",
      label: () =>
        `MUSIC: ${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.musicEnabled = !settings.musicEnabled;
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `MUSIC VOLUME: ${Math.round(settings.musicVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "musicVolume", dir);
        pauseMusicSlider.value = settings.musicVolume;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SFX: ${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.soundEffectsEnabled = !settings.soundEffectsEnabled;
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `SFX VOLUME: ${Math.round(settings.sfxVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "sfxVolume", dir);
        pauseSfxSlider.value = settings.sfxVolume;
        soundShoot.play();
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `FULLSCREEN: ${isFullscreen() ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => toggleFullscreen(),
    },
    {
      kind: "action",
      label: () => "BACK TO GAME (ESC)",
      activate: () => pauseHandlers.resume(),
    },
  ]);

  // Settings menu (audio, flash, shake, back)
  settingsMenu.setItems([
    {
      kind: "toggle",
      label: () =>
        `MUSIC: ${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.musicEnabled = !settings.musicEnabled;
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `MUSIC VOLUME: ${Math.round(settings.musicVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "musicVolume", dir);
        settingsMusicSlider.value = settings.musicVolume;
        saveSettings();
      },
    },
    {
      kind: "toggle",
      label: () =>
        `SFX: ${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}`,
      toggle: () => {
        settings.soundEffectsEnabled = !settings.soundEffectsEnabled;
        saveSettings();
      },
    },
    {
      kind: "slider",
      label: () => `SFX VOLUME: ${Math.round(settings.sfxVolume * 100)}%`,
      adjust: (dir) => {
        adjustSetting(settings, "sfxVolume", dir);
        settingsSfxSlider.value = settings.sfxVolume;
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
    {
      kind: "action",
      label: () => "BACK",
      activate: () => settingsHandlers.back(),
    },
  ]);
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

function setupWeaponUI() {
  WEAPON_ORDER.forEach((key, i) => {
    const lootKey = WEAPON_LOOT_MAPPING[key];
    const lootSpriteName = lootCfg.types[lootKey].sprite;
    const lootSprite = sprites.get(lootSpriteName, lootCfg.sheet);

    const container = new UIObject(vec2(0, 0), vec2(220, 44));
    container.color = new Color(0, 0, 0, 0);
    container.lineWidth = 0;
    container.cornerRadius = 6;
    hudGroup.addChild(container);

    const icon = new UITile(vec2(-85, 0), vec2(36, 36), lootSprite);
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

    weaponIcons.push({ key, container, icon, nameText, pipsText, index: i });
  });
}

export function updateUI() {
  if (!uiRoot) return;

  const hudScale = mainCanvasSize.y / 720;

  uiRoot.pos = mainCanvasSize.scale(0.5);
  uiRoot.size = mainCanvasSize;

  hudGroup.size = mainCanvasSize;
  titleGroup.size = mainCanvasSize;
  pauseGroup.size = mainCanvasSize;
  gameOverGroup.size = mainCanvasSize;
  settingsGroup.size = mainCanvasSize;

  hudGroup.visible =
    gameState !== GAME_STATES.TITLE && gameState !== GAME_STATES.SETTINGS;
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  gameOverGroup.visible = gameState === GAME_STATES.GAMEOVER;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;

  if (titleGroup.visible) {
    paintMenu(titleMenu, titleMenuRows, FOCUS_COLOR, IDLE_COLOR);
  }

  if (settingsGroup.visible) {
    // Mouse-driven sliders sync into settings (keyboard path also writes them).
    if (settingsMusicSlider.value !== settings.musicVolume) {
      settings.musicVolume = settingsMusicSlider.value;
    }
    if (settingsSfxSlider.value !== settings.sfxVolume) {
      settings.sfxVolume = settingsSfxSlider.value;
      soundShoot.play();
    }
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
    if (pauseMusicSlider.value !== settings.musicVolume) {
      settings.musicVolume = pauseMusicSlider.value;
    }
    if (pauseSfxSlider.value !== settings.sfxVolume) {
      settings.sfxVolume = pauseSfxSlider.value;
      soundShoot.play();
    }
    paintMenu(pauseMenu, pauseMenuRows, FOCUS_DARK, IDLE_DARK);

    if (mouseWasReleased(0)) {
      if (pauseMusicSlider.isHoverObject() || pauseSfxSlider.isHoverObject())
        saveSettings();
    }
  }

  if (gameOverGroup.visible) {
    if (gameWon) {
      gameOverTitleText.text = strings.ui.victoryTitle;
      gameOverTitleText.textColor = rgb(0.4, 1, 0.4);
      gameOverGroup.color = new Color(0, 0.15, 0, 0.6);
      retryText.text = strings.ui.victoryPrompt;
    } else {
      gameOverTitleText.text = strings.ui.gameOverTitle;
      gameOverTitleText.textColor = rgb(1, 0.2, 0.2);
      gameOverGroup.color = new Color(0.2, 0, 0, 0.6);
      retryText.text = strings.ui.retryPrompt;
    }
    retryText.visible = (timeReal * 2) % 2 < 1.2;
    finalScoreText.text = strings.ui.finalScorePrefix + formatScore();
  }

  const uiCenterX = mainCanvasSize.x / 2;
  const uiCenterY = mainCanvasSize.y / 2;
  // y-margin clears the boss bar (top padding + bar height + gap) so score/time
  // sit beneath it instead of overlapping.
  const margin = vec2(130 * hudScale, 100 * hudScale);
  const uiAnchor = vec2(-uiCenterX + margin.x, -uiCenterY + margin.y);

  scoreText.localPos = vec2(uiAnchor.x, uiAnchor.y);
  scoreText.size = vec2(300, 40).scale(hudScale);
  scoreText.textHeight = 30 * hudScale;

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
      icon.visible = i < player.hp;
    }
  });

  weaponIcons.forEach((item) => {
    item.container.localPos = vec2(
      uiAnchor.x,
      uiAnchor.y + 400 * hudScale + item.index * 54 * hudScale,
    );
    item.container.size = vec2(220, 44).scale(hudScale);
    item.icon.size = vec2(36, 36).scale(hudScale);
    item.icon.localPos = vec2(-85 * hudScale, 0);
    item.nameText.localPos = vec2(-50 * hudScale, 0);
    item.nameText.size = vec2(110, 28).scale(hudScale);
    item.nameText.textHeight = 16 * hudScale;
    item.pipsText.localPos = vec2(100 * hudScale, 0);
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

      if (level === 0) {
        item.container.color = new Color(0, 0, 0, 0);
        item.container.lineWidth = 0;
        item.icon.color = new Color(1, 1, 1, 0.2);
        item.nameText.textColor = new Color(1, 1, 1, 0.5);
        item.pipsText.textColor = new Color(1, 1, 1, 0.5);
      } else if (active) {
        item.container.color = new Color(0.2, 1, 0.2, 0.12);
        item.container.lineColor = rgb(0.3, 1, 0.3);
        item.container.lineWidth = 2;
        item.icon.color = WHITE.copy();
        item.nameText.textColor = rgb(0.4, 1, 0.4);
        item.pipsText.textColor = rgb(0.4, 1, 0.4);
      } else {
        item.container.color = new Color(0, 0, 0, 0);
        item.container.lineWidth = 0;
        item.icon.color = new Color(1, 1, 1, 0.7);
        item.nameText.textColor = WHITE.copy();
        item.pipsText.textColor = WHITE.copy();
      }
    }
  });

  updateBossHealthBar(uiCenterY, hudScale);

  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  timeText.text = `${strings.ui.timePrefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  scoreText.text = strings.ui.scorePrefix + formatScore();
}
