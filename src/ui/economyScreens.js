import { vec2, rgb, mainCanvasSize, Color, timeReal } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { formatHighScore } from "../score.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle, makeCenterLine } from "./uiText.js";
import {
  getSubstrate,
  getDebt,
  getLastRun,
  formatSubstrate,
} from "../economy.js";

const COLOR_HOME_PANEL_BG = new Color(0.04, 0.06, 0.12, 0.85);
const COLOR_HOME_TITLE = rgb(0.4, 0.9, 1);
const COLOR_POSITIVE = rgb(0.4, 1, 0.7);
const COLOR_NEGATIVE = rgb(1, 0.5, 0.3);
const COLOR_NEUTRAL = new Color(0.85, 0.85, 0.85, 1);
const COLOR_WHITE = new Color(1, 1, 1, 1);
const COLOR_DIM = new Color(0.7, 0.7, 0.7, 1);
const COLOR_DEFEAT = rgb(1, 0.2, 0.2);
const COLOR_VICTORY = rgb(0.4, 1, 0.4);
const COLOR_HIGHLIGHT = rgb(1, 0.85, 0.3);

export function createEconomyScreens(uiRoot) {
  const homeGroup = makePanel(uiRoot, {
    color: COLOR_HOME_PANEL_BG,
  });

  makeCenterTitle(homeGroup, -160, strings.ui.homeTitle, {
    color: COLOR_HOME_TITLE,
  });
  const homeBalanceText = makeCenterLine(
    homeGroup,
    -40,
    strings.ui.homeBalanceLabel,
    {
      color: COLOR_POSITIVE,
    },
  );
  const homeDebtText = makeCenterLine(homeGroup, 0, strings.ui.homeDebtLabel, {
    color: COLOR_NEGATIVE,
  });
  const homeLastRunText = makeCenterLine(
    homeGroup,
    40,
    strings.ui.homeLastRunLabel,
    {
      color: COLOR_NEUTRAL,
    },
  );

  const homeLaunchText = makeCenterLine(
    homeGroup,
    130,
    strings.ui.homeLaunchPrompt,
    {
      boxHeight: 50,
      textHeight: 28,
      color: COLOR_WHITE,
    },
  );
  makeCenterLine(homeGroup, 180, strings.ui.homeExitPrompt, {
    textHeight: 18,
    color: COLOR_DIM,
  });
  const postRunGroup = makePanel(uiRoot);

  const postRunTitleText = makeCenterTitle(
    postRunGroup,
    -90,
    strings.ui.gameOverTitle,
    {
      textHeight: 80,
      color: COLOR_DEFEAT,
      shadow: false,
    },
  );
  const finalScoreText = makeCenterTitle(
    postRunGroup,
    0,
    strings.ui.finalScorePrefix,
    {
      textHeight: 60,
      color: COLOR_WHITE,
      shadow: false,
    },
  );
  const gameOverHighScoreText = makeCenterLine(
    postRunGroup,
    35,
    strings.ui.highScorePrefix + formatHighScore(),
    { boxHeight: 40, textHeight: 26, color: COLOR_HIGHLIGHT, shadow: false },
  );
  const retryText = makeCenterLine(postRunGroup, 60, strings.ui.retryPrompt, {
    boxHeight: 50,
    textHeight: 24,
    color: COLOR_WHITE,
    shadow: false,
  });
  const backToTitleText = makeCenterLine(postRunGroup, 100, "", {
    boxHeight: 40,
    textHeight: 18,
    color: COLOR_DIM,
    shadow: false,
  });
  backToTitleText.visible = false;

  const postRunEarningsText = makeCenterLine(postRunGroup, 80, "", {
    shadow: false,
  });
  const postRunBossBonusText = makeCenterLine(postRunGroup, 110, "", {
    color: COLOR_HIGHLIGHT,
    shadow: false,
  });
  const postRunRepairText = makeCenterLine(postRunGroup, 140, "", {
    color: COLOR_NEGATIVE,
    shadow: false,
  });
  const postRunNetText = makeCenterLine(postRunGroup, 175, "", {
    textHeight: 28,
    color: COLOR_POSITIVE,
    shadow: false,
  });
  const postRunBalanceText = makeCenterLine(postRunGroup, 215, "", {
    color: COLOR_POSITIVE,
    shadow: false,
  });
  const postRunDebtText = makeCenterLine(postRunGroup, 245, "", {
    color: COLOR_NEGATIVE,
    shadow: false,
  });
  let postRunCacheWon = null;
  let postRunCacheBalance = NaN;
  let postRunCacheEarnings = NaN;
  let postRunCacheBossBonus = NaN;
  let postRunCacheRepair = NaN;
  let postRunCacheNet = NaN;
  let postRunCacheDebt = NaN;
  let postRunCacheHasDebrief = null;

  return {
    homeGroup,
    postRunGroup,
    setPostRunVisible(visible) {
      postRunGroup.visible = visible;
      if (!visible) {
        postRunCacheWon = null;
        postRunCacheBalance = NaN;
        postRunCacheEarnings = NaN;
        postRunCacheBossBonus = NaN;
        postRunCacheRepair = NaN;
        postRunCacheNet = NaN;
        postRunCacheDebt = NaN;
        postRunCacheHasDebrief = null;
      }
    },
    tick(gameState, { gameWon, lastRunDebrief } = {}) {
      homeGroup.visible = gameState === GAME_STATES.HOME;
      if (homeGroup.visible) this.updateHome();
      this.setPostRunVisible(gameState === GAME_STATES.POST_RUN);
      if (postRunGroup.visible) this.updatePostRun({ gameWon, lastRunDebrief });
    },
    updateHome() {
      homeGroup.size = mainCanvasSize;
      homeBalanceText.text =
        strings.ui.homeBalanceLabel +
        ": " +
        formatSubstrate(getSubstrate(), { compact: false });
      homeDebtText.text =
        strings.ui.homeDebtLabel +
        ": " +
        formatSubstrate(getDebt(), { compact: false });
      homeDebtText.visible = getDebt() > 0;
      const last = getLastRun();
      homeLastRunText.visible = !!last;
      if (last) {
        const sign = last.net >= 0 ? "+" : "";
        homeLastRunText.text =
          strings.ui.homeLastRunLabel +
          ": " +
          sign +
          formatSubstrate(last.net, { compact: false });
        homeLastRunText.textColor =
          last.net >= 0 ? COLOR_POSITIVE.copy() : COLOR_NEGATIVE.copy();
      }
      homeLaunchText.visible = (timeReal * 2) % 2 < 1.2;
    },
    updatePostRun({ gameWon, lastRunDebrief }) {
      postRunGroup.size = mainCanvasSize;

      const debrief = lastRunDebrief;
      const hasDebrief = !!debrief;
      const balanceForHeadline = debrief ? debrief.balance : getSubstrate();
      const earnings = debrief ? debrief.earnings : NaN;
      const bossBonus = debrief ? debrief.bossBonus : NaN;
      const repair = debrief ? debrief.repair : NaN;
      const net = debrief ? debrief.net : NaN;
      const debt = debrief ? debrief.debt : NaN;
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
          postRunTitleText.text = strings.ui.postRunVictoryTitle;
          postRunTitleText.textColor = COLOR_VICTORY.copy();
        } else {
          postRunTitleText.text = strings.ui.postRunDefeatTitle;
          postRunTitleText.textColor = COLOR_DEFEAT.copy();
        }
        retryText.text = strings.ui.postRunContinuePrompt;
        finalScoreText.text =
          strings.ui.postRunSubstratePrefix +
          formatSubstrate(balanceForHeadline, { compact: false });
        finalScoreText.textColor = COLOR_POSITIVE.copy();
        gameOverHighScoreText.visible = false;

        const showBreakdown = !!debrief;
        postRunEarningsText.visible = showBreakdown;
        postRunBossBonusText.visible = showBreakdown && debrief.bossBonus > 0;
        postRunRepairText.visible = showBreakdown;
        postRunNetText.visible = showBreakdown;
        postRunBalanceText.visible = showBreakdown;
        postRunDebtText.visible = showBreakdown && debrief.debt > 0;

        if (debrief) {
          postRunEarningsText.text =
            strings.ui.postRunEarningsLabel +
            ": +" +
            formatSubstrate(debrief.earnings, { compact: false });
          postRunBossBonusText.text =
            strings.ui.postRunBossBonusLabel +
            ": +" +
            formatSubstrate(debrief.bossBonus, { compact: false });
          postRunRepairText.text =
            strings.ui.postRunRepairLabel +
            ": -" +
            formatSubstrate(debrief.repair, { compact: false });
          const netSign = debrief.net >= 0 ? "+" : "";
          postRunNetText.text =
            strings.ui.postRunNetLabel +
            ": " +
            netSign +
            formatSubstrate(debrief.net, { compact: false });
          postRunNetText.textColor =
            debrief.net >= 0 ? COLOR_POSITIVE.copy() : COLOR_NEGATIVE.copy();
          postRunBalanceText.text =
            strings.ui.postRunBalanceLabel +
            ": " +
            formatSubstrate(debrief.balance, { compact: false });
          postRunDebtText.text =
            strings.ui.postRunDebtLabel +
            ": " +
            formatSubstrate(debrief.debt, { compact: false });
        }
      }

      retryText.localPos = vec2(0, Math.floor(mainCanvasSize.y * 0.42));
      retryText.visible = (timeReal * 2) % 2 < 1.2;
    },
  };
}
