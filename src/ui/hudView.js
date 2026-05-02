import {
  vec2,
  WHITE,
  UIObject,
  UITile,
  timeReal,
  mainCanvasSize,
  cameraScale,
  Color,
} from "../engine.js";

import { player } from "../entities/player.js";
import { sprites } from "../visuals/sprites.js";
import {
  GAME_STATES,
  player as playerCfg,
  weapons as weaponsCfg,
  system,
} from "../config/index.js";
import { getLiveSubstrate } from "../game/economy.js";
import {
  initHudOverlay,
  setHudOverlayVisible,
  updateHudOverlay,
} from "./hudOverlay.js";

const BOSS_BAR = {
  padding: 40,
  height: 32,
  border: 2,
  fgInset: 4,
  revealDuration: 0.6,
};

const HUD_EMBED_BG = "embed_bg.png";

export function createHudView(parent) {
  const hudGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  hudGroup.color = new Color(0, 0, 0, 0);
  hudGroup.lineWidth = 0;
  parent.addChild(hudGroup);

  const hudBackground = setupHudBackground(hudGroup);

  initHudOverlay();

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
      const uiCenterY = Math.floor(mainCanvasSize.y / 2);

      hudGroup.size = mainCanvasSize;

      if (hudBackground) {
        hudBackground.localPos = vec2(0, 0);
        hudBackground.size = getAspectFitSize(
          mainCanvasSize,
          hudBackground._sourceSize,
        );
      }

      updateHudOverlay({
        substrate: getLiveSubstrate(),
        gameTime,
        playerHp: player ? player.hp : 0,
        maxHp: playerCfg.hp,
        weaponLevels: player ? player.weaponLevels : {},
        currentWeaponKey: player ? player.currentWeaponKey : null,
        maxLevel: player ? player.maxLevel : 3,
        weaponsCfg,
      });

      updateBossHealthBar(currentBoss, uiCenterY, hudScale);
    },
    tick(gameState, data) {
      const visible =
        gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSE;
      hudGroup.visible = visible;
      setHudOverlayVisible(visible);
      if (visible) this.update(data);
    },
  };
}

function setupHudBackground(hudGroup) {
  const embedBg = sprites.get(HUD_EMBED_BG);
  if (!embedBg) return null;

  const bg = new UITile(vec2(0, 0), mainCanvasSize, embedBg);
  bg.color = WHITE.copy();
  bg._sourceSize = vec2(embedBg.size.x, embedBg.size.y);

  hudGroup.addChild(bg);
  return bg;
}

function getAspectFitSize(containerSize, sourceSize) {
  if (!sourceSize || !sourceSize.x || !sourceSize.y) {
    return vec2(containerSize.x, containerSize.y);
  }

  const scale = Math.min(
    containerSize.x / sourceSize.x,
    containerSize.y / sourceSize.y,
  );
  return vec2(sourceSize.x * scale, sourceSize.y * scale);
}
