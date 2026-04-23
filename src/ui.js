import {
  vec2,
  rgb,
  WHITE,
  UISystemPlugin,
  uiSystem,
  UIObject,
  UIText,
  UITile,
  time,
  timeReal,
  mainCanvasSize,
  Color,
  BLACK,
  UISlider,
  setSoundVolume,
} from "./engine.js";

import { player } from "./entities/player.js";
import { sprites } from "./sprites.js";
import {
  player as playerCfg,
  loot as lootCfg,
  settings,
  GAME_STATES,
  strings,
  system,
} from "./config.js";
import { gameState } from "../game.js";

let uiRoot;
let scoreText, timeText;
let healthIcons = [];
let weaponIcons = [];
let hudGroup, titleGroup, pauseGroup, gameOverGroup, settingsGroup;
let playPromptText,
  titleText,
  subtitleText,
  controlGroup,
  controlsTitle,
  controlsBody,
  settingsPromptText;
let settingsTitle, musicToggleText, sfxToggleText, backPromptText;
let pausePanel, pauseMusicToggleText, pauseSfxToggleText;
let pauseMusicSlider, pauseSfxSlider;
let settingsMusicSlider, settingsSfxSlider;
let retryText;

const WEAPON_ORDER = ["vulcan", "shotgun", "latch"];
const WEAPON_LOOT_MAPPING = {
  vulcan: "blue",
  shotgun: "red",
  latch: "green",
};

export function initUI() {
  new UISystemPlugin();
  uiSystem.nativeHeight = 0; // Use pixel-based coords for stability

  // Root covers the entire canvas, centered dynamically in updateUI
  uiRoot = new UIObject(mainCanvasSize.scale(0.5), mainCanvasSize);
  uiRoot.color = new Color(0, 0, 0, 0);
  uiRoot.lineWidth = 0;

  // HUD Group (Score, Time, Health, Weapons, Settings)
  hudGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  hudGroup.color = new Color(0, 0, 0, 0);
  hudGroup.lineWidth = 0;
  uiRoot.addChild(hudGroup);

  // Score (Placeholder)
  scoreText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.scorePrefix + "000000",
  );
  scoreText.textColor = WHITE.copy();
  scoreText.textAlign = "left";
  scoreText.fontShadow = true;
  hudGroup.addChild(scoreText);

  // Time
  timeText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.timePrefix + "00:00",
  );
  timeText.textColor = WHITE.copy();
  timeText.textAlign = "right";
  timeText.fontShadow = true;
  hudGroup.addChild(timeText);

  // Health Icons
  setupHealthUI();

  setupWeaponUI();

  // Title Screen
  titleGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  titleGroup.color = new Color(0, 0, 0.1, 0.7);
  titleGroup.lineWidth = 0;
  uiRoot.addChild(titleGroup);

  titleText = new UIText(vec2(0, -200), vec2(1000, 120), strings.ui.title);
  titleText.textHeight = 100;
  titleText.fontShadow = true;
  titleText.textColor = rgb(0.4, 0.7, 1);
  titleGroup.addChild(titleText);

  subtitleText = new UIText(vec2(0, -110), vec2(1000, 40), strings.ui.subtitle);
  subtitleText.textHeight = 30;
  subtitleText.textColor = WHITE.copy();
  titleGroup.addChild(subtitleText);

  // Controls Section
  controlGroup = new UIObject(vec2(0, 50), vec2(600, 200));
  controlGroup.color = new Color(0, 0, 0, 0);
  controlGroup.lineWidth = 0;
  titleGroup.addChild(controlGroup);

  controlsTitle = new UIText(
    vec2(0, -80),
    vec2(400, 30),
    strings.ui.controlsTitle,
  );
  controlsTitle.textHeight = 24;
  controlsTitle.textColor = rgb(0.2, 1, 0.2);
  controlGroup.addChild(controlsTitle);

  controlsBody = new UIText(
    vec2(0, 0),
    vec2(600, 100),
    strings.ui.controlsBody,
  );
  controlsBody.textHeight = 20;
  controlsBody.textColor = WHITE.copy();
  controlGroup.addChild(controlsBody);

  const playPromptString = strings.ui.playPrompt.replace(
    "<KEY>",
    system.shootKey.toUpperCase(),
  );
  playPromptText = new UIText(vec2(0, 0), vec2(800, 100), playPromptString);
  playPromptText.textHeight = 48;
  playPromptText.textColor = WHITE.copy();
  playPromptText.fontShadow = true;
  titleGroup.addChild(playPromptText);

  settingsPromptText = new UIText(
    vec2(0, 240),
    vec2(800, 30),
    strings.ui.settingsPrompt,
  );
  settingsPromptText.textHeight = 20;
  settingsPromptText.textColor = rgb(0.7, 0.7, 0.7);
  titleGroup.addChild(settingsPromptText);

  // Pause Screen
  pauseGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  pauseGroup.color = new Color(0, 0, 0, 0.5);
  pauseGroup.lineWidth = 0;
  uiRoot.addChild(pauseGroup);

  pausePanel = new UIObject(vec2(0, 0), vec2(600, 400));
  pausePanel.color = new Color(1, 1, 1, 0.8);
  pausePanel.cornerRadius = 10;
  pauseGroup.addChild(pausePanel);

  const pauseText = new UIText(
    vec2(0, -150),
    vec2(500, 100),
    strings.ui.pauseTitle,
  );
  pauseText.textHeight = 80;
  pauseText.textColor = BLACK.copy();
  pausePanel.addChild(pauseText);

  pauseMusicToggleText = new UIText(vec2(0, -80), vec2(500, 50), "");
  pauseMusicToggleText.textHeight = 30;
  pauseMusicToggleText.textColor = rgb(0.2, 0.2, 0.2);
  pausePanel.addChild(pauseMusicToggleText);

  pauseMusicSlider = new UISlider(
    vec2(0, -40),
    vec2(400, 20),
    settings.musicVolume,
  );
  pauseMusicSlider.color = rgb(0.4, 0.7, 1);
  pausePanel.addChild(pauseMusicSlider);

  pauseSfxToggleText = new UIText(vec2(0, 40), vec2(500, 50), "");
  pauseSfxToggleText.textHeight = 30;
  pauseSfxToggleText.textColor = rgb(0.2, 0.2, 0.2);
  pausePanel.addChild(pauseSfxToggleText);

  pauseSfxSlider = new UISlider(
    vec2(0, 80),
    vec2(400, 20),
    settings.sfxVolume,
  );
  pauseSfxSlider.color = rgb(0.2, 1, 0.2);
  pausePanel.addChild(pauseSfxSlider);

  const resumeText = new UIText(
    vec2(0, 150),
    vec2(500, 50),
    strings.ui.resumePrompt,
  );
  resumeText.textHeight = 24;
  resumeText.textColor = rgb(0.4, 0.4, 0.4);
  pausePanel.addChild(resumeText);

  // Game Over Screen
  gameOverGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  gameOverGroup.color = new Color(0.2, 0, 0, 0.6);
  gameOverGroup.lineWidth = 0;
  uiRoot.addChild(gameOverGroup);

  const gameOverText = new UIText(
    vec2(0, -60),
    vec2(800, 100),
    strings.ui.gameOverTitle,
  );
  gameOverText.textHeight = 80;
  gameOverText.textColor = rgb(1, 0.2, 0.2);
  gameOverText.fontShadow = true;
  gameOverGroup.addChild(gameOverText);

  retryText = new UIText(vec2(0, 60), vec2(800, 50), strings.ui.retryPrompt);
  retryText.textHeight = 24;
  retryText.textColor = WHITE.copy();
  retryText.fontShadow = true;
  gameOverGroup.addChild(retryText);

  // Settings Menu Screen
  settingsGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  settingsGroup.color = new Color(0.05, 0.05, 0.1, 0.9);
  settingsGroup.lineWidth = 0;
  uiRoot.addChild(settingsGroup);

  settingsTitle = new UIText(
    vec2(0, -150),
    vec2(800, 100),
    strings.ui.settingsTitle,
  );
  settingsTitle.textHeight = 80;
  settingsTitle.fontShadow = true;
  settingsTitle.textColor = rgb(1, 0.8, 0.2);
  settingsGroup.addChild(settingsTitle);

  musicToggleText = new UIText(
    vec2(0, -20),
    vec2(800, 50),
    `${strings.ui.musicLabel}${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.musicHotkey}`,
  );
  musicToggleText.textHeight = 40;
  musicToggleText.textColor = WHITE.copy();
  musicToggleText.fontShadow = true;
  settingsGroup.addChild(musicToggleText);

  sfxToggleText = new UIText(
    vec2(0, 60),
    vec2(800, 50),
    `${strings.ui.sfxLabel}${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.sfxHotkey}`,
  );
  sfxToggleText.textHeight = 40;
  sfxToggleText.textColor = WHITE.copy();
  sfxToggleText.fontShadow = true;
  settingsGroup.addChild(sfxToggleText);

  settingsMusicSlider = new UISlider(
    vec2(0, 20),
    vec2(400, 30),
    settings.musicVolume,
  );
  settingsMusicSlider.color = rgb(0.4, 0.7, 1);
  settingsGroup.addChild(settingsMusicSlider);

  settingsSfxSlider = new UISlider(
    vec2(0, 140),
    vec2(400, 30),
    settings.sfxVolume,
  );
  settingsSfxSlider.color = rgb(0.2, 1, 0.2);
  settingsGroup.addChild(settingsSfxSlider);

  backPromptText = new UIText(
    vec2(0, 200),
    vec2(800, 50),
    strings.ui.backPrompt,
  );
  backPromptText.textHeight = 24;
  backPromptText.textColor = rgb(0.6, 0.6, 0.6);
  settingsGroup.addChild(backPromptText);
}

function setupHealthUI() {
  const heartSprite = sprites.get("playerLife2_blue.png", playerCfg.sheet);

  for (let i = 0; i < playerCfg.hp; i++) {
    const icon = new UITile(
      vec2(0, 0), // Position updated in updateUI
      vec2(37, 26).scale(0.8),
      heartSprite,
    );
    // Tint to white - high values help wash out the original color
    icon.color = new Color(5, 5, 5, 1);
    hudGroup.addChild(icon);
    healthIcons.push(icon);
  }
}

function setupWeaponUI() {
  WEAPON_ORDER.forEach((key, i) => {
    const lootKey = WEAPON_LOOT_MAPPING[key];
    const lootSpriteName = lootCfg.types[lootKey].sprite;
    const lootSprite = sprites.get(lootSpriteName, lootCfg.sheet);

    // Row container
    const container = new UIObject(vec2(0, 0), vec2(200, 40));
    container.color = new Color(0, 0, 0, 0);
    container.lineWidth = 0;
    hudGroup.addChild(container);

    // Icon on the left
    const icon = new UITile(vec2(-70, 0), vec2(40, 40), lootSprite);
    container.addChild(icon);

    // Text on the right
    const levelText = new UIText(
      vec2(20, 0),
      vec2(120, 30),
      strings.ui.levelPrefix + "0",
      "left",
    );
    levelText.textHeight = 18;
    container.addChild(levelText);

    weaponIcons.push({ key, container, icon, levelText, index: i });
  });
}

export function updateUI() {
  if (!uiRoot) return;

  const hudScale = mainCanvasSize.y / 720;

  // Keep root centered and sized to canvas
  uiRoot.pos = mainCanvasSize.scale(0.5);
  uiRoot.size = mainCanvasSize;

  hudGroup.size = mainCanvasSize;
  titleGroup.size = mainCanvasSize;
  pauseGroup.size = mainCanvasSize;
  gameOverGroup.size = mainCanvasSize;

  hudGroup.visible =
    gameState !== GAME_STATES.TITLE && gameState !== GAME_STATES.SETTINGS;
  titleGroup.visible = gameState === GAME_STATES.TITLE;
  pauseGroup.visible = gameState === GAME_STATES.PAUSE;
  gameOverGroup.visible = gameState === GAME_STATES.GAMEOVER;
  settingsGroup.visible = gameState === GAME_STATES.SETTINGS;

  if (titleGroup.visible) {
    const scale = hudScale;
    titleText.localPos = vec2(0, -200 * scale);
    titleText.size = vec2(1000, 120).scale(scale);
    titleText.textHeight = 100 * scale;

    subtitleText.localPos = vec2(0, -110 * scale);
    subtitleText.size = vec2(1000, 40).scale(scale);
    subtitleText.textHeight = 30 * scale;

    controlGroup.localPos = vec2(0, 50 * scale);
    controlGroup.size = vec2(600, 200).scale(scale);
    controlsTitle.localPos = vec2(0, -80 * scale);
    controlsTitle.textHeight = 24 * scale;
    controlsBody.localPos = vec2(0, 0);
    controlsBody.textHeight = 20 * scale;

    playPromptText.localPos = vec2(0, 180 * scale);
    playPromptText.size = vec2(800, 60).scale(scale);
    playPromptText.textHeight = 36 * scale;
    playPromptText.textColor = WHITE.copy();

    // Re-enabled blinking
    playPromptText.visible = (timeReal * 2) % 2 < 1.2;

    settingsPromptText.localPos = vec2(0, 260 * scale);
    settingsPromptText.textHeight = 20 * scale;
  }

  if (settingsGroup.visible) {
    const scale = hudScale;
    settingsTitle.localPos = vec2(0, -180 * scale);
    settingsTitle.textHeight = 80 * scale;

    musicToggleText.localPos = vec2(0, -100 * scale);
    musicToggleText.textHeight = 40 * scale;
    musicToggleText.text = `${strings.ui.musicLabel}${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.musicHotkey}`;

    settingsMusicSlider.localPos = vec2(0, -50 * scale);
    settingsMusicSlider.size = vec2(400, 30).scale(scale);
    settings.musicVolume = settingsMusicSlider.value;

    sfxToggleText.localPos = vec2(0, 50 * scale);
    sfxToggleText.textHeight = 40 * scale;
    sfxToggleText.text = `${strings.ui.sfxLabel}${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.sfxHotkey}`;

    settingsSfxSlider.localPos = vec2(0, 100 * scale);
    settingsSfxSlider.size = vec2(400, 30).scale(scale);
    settings.sfxVolume = settingsSfxSlider.value;

    backPromptText.localPos = vec2(0, 220 * scale);
    backPromptText.textHeight = 24 * scale;
  }

  if (pauseGroup.visible) {
    const scale = hudScale;
    pausePanel.size = vec2(600, 400).scale(scale);
    
    // pauseText
    pausePanel.children[0].textHeight = 80 * scale;
    pausePanel.children[0].localPos = vec2(0, -150 * scale);
    
    // pauseMusicToggleText
    pauseMusicToggleText.textHeight = 30 * scale;
    pauseMusicToggleText.localPos = vec2(0, -80 * scale);
    pauseMusicToggleText.text = `${strings.ui.musicLabel}${settings.musicEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.musicHotkey}`;
    
    // pauseMusicSlider
    pauseMusicSlider.localPos = vec2(0, -40 * scale);
    pauseMusicSlider.size = vec2(400, 20).scale(scale);
    settings.musicVolume = pauseMusicSlider.value;
    
    // pauseSfxToggleText
    pauseSfxToggleText.textHeight = 30 * scale;
    pauseSfxToggleText.localPos = vec2(0, 40 * scale);
    pauseSfxToggleText.text = `${strings.ui.sfxLabel}${settings.soundEffectsEnabled ? strings.ui.onLabel : strings.ui.offLabel}${strings.ui.sfxHotkey}`;
    
    // pauseSfxSlider
    pauseSfxSlider.localPos = vec2(0, 80 * scale);
    pauseSfxSlider.size = vec2(400, 20).scale(scale);
    settings.sfxVolume = pauseSfxSlider.value;
    
    // resumeText
    pausePanel.children[5].textHeight = 24 * scale;
    pausePanel.children[5].localPos = vec2(0, 150 * scale);
  }

  if (gameOverGroup.visible) {
    const scale = hudScale;
    retryText.localPos = vec2(0, 60 * scale);
    retryText.textHeight = 24 * scale;
    // Blinking effect
    retryText.visible = (timeReal * 2) % 2 < 1.2;
  }

  const uiCenterX = mainCanvasSize.x / 2;
  const uiCenterY = mainCanvasSize.y / 2;
  const margin = vec2(130 * hudScale, 60 * hudScale);

  // Update positions for responsiveness
  const uiAnchor = vec2(-uiCenterX + margin.x, -uiCenterY + margin.y);

  scoreText.localPos = vec2(uiAnchor.x, uiAnchor.y);
  scoreText.size = vec2(300, 40).scale(hudScale);
  scoreText.textHeight = 30 * hudScale;

  timeText.localPos = vec2(-uiAnchor.x, uiAnchor.y);
  timeText.size = vec2(300, 40).scale(hudScale);
  timeText.textHeight = 30 * hudScale;

  // Update Health positions
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

  // Update Weapon positions
  weaponIcons.forEach((item) => {
    item.container.localPos = vec2(
      uiAnchor.x,
      uiAnchor.y + 400 * hudScale + item.index * 60 * hudScale,
    );
    item.container.size = vec2(200, 50).scale(hudScale);
    item.icon.size = vec2(40, 40).scale(hudScale);
    item.icon.localPos = vec2(-70 * hudScale, 0);
    item.levelText.localPos = vec2(-30 * hudScale, 0);
    item.levelText.size = vec2(120, 30).scale(hudScale);
    item.levelText.textHeight = 18 * hudScale;

    if (player) {
      const level = player.weaponLevels[item.key];
      const active = player.currentWeaponKey === item.key;

      item.levelText.text =
        level > 0 ? strings.ui.levelPrefix + level : strings.ui.lockedLabel;

      // Highlight active weapon
      if (level === 0) {
        item.icon.color = new Color(1, 1, 1, 0.2);
        item.levelText.textColor = new Color(1, 1, 1, 0.5);
      } else if (active) {
        item.icon.color = WHITE.copy();
        item.levelText.textColor = rgb(0.2, 1, 0.2); // Green for active
        item.container.scale = 1.1;
      } else {
        item.icon.color = new Color(1, 1, 1, 0.7);
        item.levelText.textColor = WHITE.copy();
        item.container.scale = 1.0;
      }
    }
  });

  // Update Time
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  timeText.text = `${strings.ui.timePrefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
