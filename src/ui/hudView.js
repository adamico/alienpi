import {
  vec2,
  rgb,
  WHITE,
  UIObject,
  UIText,
  UITile,
  timeReal,
  mainCanvasSize,
  cameraScale,
  Color,
} from "../engine.js";

import { player } from "../entities/player.js";
import { sprites } from "../sprites.js";
import {
  GAME_STATES,
  player as playerCfg,
  loot as lootCfg,
  weapons as weaponsCfg,
  system,
  strings,
} from "../config.js";
import { drawLootCell } from "../lootIcon.js";
import { getSubstrate, getDebt, formatSubstrate } from "../economy.js";

const BOSS_BAR = {
  padding: 40,
  height: 32,
  border: 2,
  fgInset: 4,
  revealDuration: 0.6,
};

const PIP_FILLED = "■";
const PIP_EMPTY = "□";
const LOOT_ICON_H = 26;
const LOOT_ICON_W = Math.round(LOOT_ICON_H * (lootCfg.size.x / lootCfg.size.y));

export function createHudView(parent) {
  const hudGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  hudGroup.color = new Color(0, 0, 0, 0);
  hudGroup.lineWidth = 0;
  parent.addChild(hudGroup);

  const scoreText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.substratePrefix + "0",
  );
  scoreText.textColor = rgb(0.4, 1, 0.7);
  scoreText.textAlign = "left";
  scoreText.fontShadow = true;
  hudGroup.addChild(scoreText);

  const hudHighScoreText = new UIText(
    vec2(0, 0),
    vec2(300, 24),
    strings.ui.debtPrefix + "0",
  );
  hudHighScoreText.textColor = new Color(1, 0.5, 0.3, 0.85);
  hudHighScoreText.textAlign = "left";
  hudHighScoreText.fontShadow = true;
  hudGroup.addChild(hudHighScoreText);

  const timeText = new UIText(
    vec2(0, 0),
    vec2(300, 30),
    strings.ui.timePrefix + "00:00",
  );
  timeText.textColor = WHITE.copy();
  timeText.textAlign = "right";
  timeText.fontShadow = true;
  hudGroup.addChild(timeText);

  const healthIcons = [];
  setupHealthUI(hudGroup, healthIcons);

  const weaponIcons = [];
  setupWeaponUI(hudGroup, weaponIcons);

  const bossHealthGroup = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthGroup.color = new Color(0, 0, 0, 0);
  bossHealthGroup.lineWidth = 0;
  hudGroup.addChild(bossHealthGroup);

  const bossHealthBg = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthBg.lineWidth = BOSS_BAR.border;
  bossHealthGroup.addChild(bossHealthBg);

  const bossHealthFg = new UIObject(
    vec2(0, 0),
    vec2(BOSS_BAR.height, BOSS_BAR.height),
  );
  bossHealthFg.lineWidth = 0;
  bossHealthBg.addChild(bossHealthFg);

  let bossBarRevealStartT = null;

  function updateBossHealthBar(currentBoss, uiCenterY, hudScale) {
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
    const ease = t * t * (3 - 2 * t);
    const flash = 1 - ease;

    const yOffset = BOSS_BAR.padding + BOSS_BAR.height / 2;
    bossHealthGroup.localPos = vec2(0, -uiCenterY + yOffset * hudScale);

    const playfieldWidth = system.levelSize.x * cameraScale;
    const marqueeWidth = (mainCanvasSize.x - playfieldWidth) / 2;
    const fullBgWidth =
      mainCanvasSize.x - (marqueeWidth + BOSS_BAR.padding * hudScale) * 2;
    const bgWidth = fullBgWidth * ease;
    bossHealthBg.size = vec2(bgWidth, BOSS_BAR.height * hudScale);

    const hpPercent = Math.max(0, currentBoss.hp / currentBoss.maxHp);
    const fgMaxWidth = (fullBgWidth - BOSS_BAR.fgInset * 2 * hudScale) * ease;
    const fgWidth = fgMaxWidth * hpPercent;
    bossHealthFg.size = vec2(
      fgWidth,
      (BOSS_BAR.height - BOSS_BAR.fgInset * 2) * hudScale,
    );
    bossHealthFg.localPos = vec2(-(fgMaxWidth - fgWidth) / 2, 0);

    bossHealthBg.color = new Color(0.2 + 0.8 * flash, flash, flash, 0.7);
    bossHealthBg.lineColor = new Color(1, flash, flash);
    bossHealthFg.color = new Color(1, 0.2 + 0.8 * flash, 0.2 + 0.8 * flash);
  }

  return {
    root: hudGroup,
    setVisible(visible) {
      hudGroup.visible = visible;
    },
    update({ gameTime, currentBoss }) {
      const hudScale = mainCanvasSize.y / 720;
      const uiCenterX = Math.floor(mainCanvasSize.x / 2);
      const uiCenterY = Math.floor(mainCanvasSize.y / 2);
      const margin = vec2(125 * hudScale, 100 * hudScale);
      const uiAnchor = vec2(-uiCenterX + margin.x, -uiCenterY + margin.y);

      hudGroup.size = mainCanvasSize;

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

      updateBossHealthBar(currentBoss, uiCenterY, hudScale);

      const minutes = Math.floor(gameTime / 60);
      const seconds = Math.floor(gameTime % 60);
      timeText.text = `${strings.ui.timePrefix}${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    },
    tick(gameState, data) {
      hudGroup.visible =
        gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE;
      if (hudGroup.visible) this.update(data);
    },
  };
}

function setupHealthUI(hudGroup, healthIcons) {
  const heartSprite = sprites.get(playerCfg.hpIcon, playerCfg.hpIconSheet);
  for (let i = 0; i < playerCfg.hp; i++) {
    const icon = new UITile(vec2(0, 0), vec2(37, 26).scale(0.8), heartSprite);
    icon.color = WHITE.copy();
    hudGroup.addChild(icon);
    healthIcons.push(icon);
  }
}

function setupWeaponUI(hudGroup, weaponIcons) {
  const weaponOrder = ["vulcan", "shotgun", "latch"];
  const weaponLootMapping = {
    vulcan: "blue",
    shotgun: "red",
    latch: "green",
  };

  weaponOrder.forEach((key, i) => {
    const lootKey = weaponLootMapping[key];
    const typeCfg = lootCfg.types[lootKey];

    const container = new UIObject(vec2(0, 0), vec2(220, 44));
    container.color = new Color(0, 0, 0, 0);
    container.lineWidth = 0;
    container.cornerRadius = 6;
    hudGroup.addChild(container);

    const icon = new UIObject(vec2(-85, 0), vec2(LOOT_ICON_W, LOOT_ICON_H));
    icon.color = new Color(0, 0, 0, 0);
    icon.lineWidth = 0;
    icon.cornerRadius = 0;
    icon._alpha = 1.0;
    icon.onRender = function () {
      const c = typeCfg.color.copy();
      c.a *= this._alpha;
      drawLootCell(this.pos, this.size, c, typeCfg.letter, true);
    };
    container.addChild(icon);

    const nameText = new UIText(vec2(-50, 0), vec2(110, 28), "", "left");
    nameText.textHeight = 16;
    nameText.fontShadow = true;
    container.addChild(nameText);

    const pipsText = new UIText(vec2(85, 0), vec2(70, 28), "", "right");
    pipsText.textHeight = 16;
    pipsText.fontShadow = true;
    container.addChild(pipsText);

    weaponIcons.push({
      key,
      container,
      icon,
      nameText,
      pipsText,
      index: i,
    });
  });
}