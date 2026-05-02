import { vec2, rgb, mainCanvasSize, Color, timeReal } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { formatHighScore } from "../game/score.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle, makeCenterLine } from "./uiText.js";
import {
  getSubstrate,
  getDebt,
  getLastRun,
  formatSubstrate,
} from "../game/economy.js";
import { playSfx } from "../audio/soundManager.js";
import { soundScorePing } from "../audio/sounds.js";

// Post-run stat count-up animation helpers.
// Each stat has a stagger delay (startAt) and a count-up window (dur), both
// in real-time seconds. Returns null until the stat's reveal time is reached.
function animCountUp(target, elapsed, startAt, dur) {
  if (elapsed < startAt) return null;
  const t = Math.min((elapsed - startAt) / dur, 1);
  const ease = 1 - (1 - t) ** 2; // ease-out quadratic
  return Math.round(target * ease);
}

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

  makeCenterTitle(homeGroup, -160, strings.home.title, {
    color: COLOR_HOME_TITLE,
  });
  const homeBalanceText = makeCenterLine(
    homeGroup,
    -40,
    strings.home.balanceLabel,
    {
      color: COLOR_POSITIVE,
    },
  );
  const homeDebtText = makeCenterLine(homeGroup, 0, strings.home.debtLabel, {
    color: COLOR_NEGATIVE,
  });
  const homeLastRunText = makeCenterLine(
    homeGroup,
    40,
    strings.home.lastRunLabel,
    {
      color: COLOR_NEUTRAL,
    },
  );

  const homeLaunchText = makeCenterLine(
    homeGroup,
    130,
    strings.home.launchPrompt,
    {
      boxHeight: 50,
      textHeight: 28,
      color: COLOR_WHITE,
    },
  );
  makeCenterLine(homeGroup, 180, strings.home.exitPrompt, {
    textHeight: 18,
    color: COLOR_DIM,
  });
  const postRunGroup = makePanel(uiRoot);

  const postRunTitleText = makeCenterTitle(
    postRunGroup,
    -200,
    strings.postRun.gameOverTitle,
    {
      textHeight: 80,
      color: COLOR_DEFEAT,
      shadow: false,
    },
  );
  const finalScoreText = makeCenterTitle(
    postRunGroup,
    0,
    strings.postRun.finalScorePrefix,
    {
      textHeight: 60,
      color: COLOR_WHITE,
      shadow: false,
    },
  );
  const gameOverHighScoreText = makeCenterLine(
    postRunGroup,
    35,
    strings.title.highScorePrefix + formatHighScore(),
    { boxHeight: 40, textHeight: 26, color: COLOR_HIGHLIGHT, shadow: false },
  );
  const retryText = makeCenterLine(
    postRunGroup,
    60,
    strings.postRun.retryPrompt,
    {
      boxHeight: 50,
      textHeight: 24,
      color: COLOR_WHITE,
      shadow: false,
    },
  );
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
  // Count-up animation state.
  let postRunAnimStartTime = NaN;
  let postRunPrevAnimatedScore = NaN;
  let postRunPrevAnimatedEarnings = NaN;
  let postRunPrevAnimatedBossBonus = NaN;
  let postRunPrevAnimatedRepair = NaN;
  let postRunPrevAnimatedNet = NaN;
  let postRunPrevAnimatedBalance = NaN;
  let postRunPrevAnimatedDebt = NaN;
  let postRunNextScorePingTime = 0;

  function playPingOnIncrement(currentValue, prevValue, pitch = 1.05) {
    if (currentValue === null || currentValue === prevValue) return prevValue;
    if (timeReal < postRunNextScorePingTime) return prevValue;
    postRunNextScorePingTime = timeReal + 0.05;
    playSfx(soundScorePing, undefined, 0.35, pitch);
    return currentValue;
  }

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
        postRunAnimStartTime = NaN;
        postRunPrevAnimatedScore = NaN;
        postRunPrevAnimatedEarnings = NaN;
        postRunPrevAnimatedBossBonus = NaN;
        postRunPrevAnimatedRepair = NaN;
        postRunPrevAnimatedNet = NaN;
        postRunPrevAnimatedBalance = NaN;
        postRunPrevAnimatedDebt = NaN;
        postRunNextScorePingTime = 0;
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
        strings.home.balanceLabel +
        ": " +
        formatSubstrate(getSubstrate(), { compact: false });
      homeDebtText.text =
        strings.home.debtLabel +
        ": " +
        formatSubstrate(getDebt(), { compact: false });
      homeDebtText.visible = getDebt() > 0;
      const last = getLastRun();
      homeLastRunText.visible = !!last;
      if (last) {
        const sign = last.net >= 0 ? "+" : "";
        homeLastRunText.text =
          strings.home.lastRunLabel +
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
      const headlineEarnings = Number.isFinite(earnings)
        ? Math.max(0, earnings)
        : 0;
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
          postRunTitleText.text = strings.postRun.victoryTitle;
          postRunTitleText.textColor = COLOR_VICTORY.copy();
        } else {
          postRunTitleText.text = strings.postRun.defeatTitle;
          postRunTitleText.textColor = COLOR_DEFEAT.copy();
        }
        retryText.text = strings.postRun.continuePrompt;
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
          postRunNetText.textColor =
            debrief.net >= 0 ? COLOR_POSITIVE.copy() : COLOR_NEGATIVE.copy();
        }

        // Start count-up animation from this frame.
        postRunAnimStartTime = timeReal;
        postRunPrevAnimatedScore = NaN;
        postRunPrevAnimatedEarnings = NaN;
        postRunPrevAnimatedBossBonus = NaN;
        postRunPrevAnimatedRepair = NaN;
        postRunPrevAnimatedNet = NaN;
        postRunPrevAnimatedBalance = NaN;
        postRunPrevAnimatedDebt = NaN;
        postRunNextScorePingTime = timeReal;
      }

      // Animate all numeric text fields every frame while screen is active.
      if (!isNaN(postRunAnimStartTime)) {
        const el = timeReal - postRunAnimStartTime;

        // Headline starts immediately (stagger 0s, 1.2s count-up).
        const animScore = animCountUp(headlineEarnings, el, 0.0, 1.2);
        finalScoreText.text =
          strings.postRun.earningsLabel +
          ": +" +
          formatSubstrate(animScore, { compact: false });
        postRunPrevAnimatedScore = playPingOnIncrement(
          animScore,
          postRunPrevAnimatedScore,
          1.05,
        );

        if (debrief) {
          // Earnings: stagger 0.4s
          if (postRunEarningsText.visible) {
            const v = animCountUp(earnings, el, 0.4, 0.6);
            postRunEarningsText.text =
              v !== null
                ? strings.postRun.earningsLabel +
                  ": +" +
                  formatSubstrate(v, { compact: false })
                : "";
            postRunPrevAnimatedEarnings = playPingOnIncrement(
              v,
              postRunPrevAnimatedEarnings,
              1.08,
            );
          }

          // Boss bonus: stagger 0.7s (only visible when bossBonus > 0)
          if (postRunBossBonusText.visible) {
            const v = animCountUp(bossBonus, el, 0.7, 0.6);
            postRunBossBonusText.text =
              v !== null
                ? strings.postRun.bossBonusLabel +
                  ": +" +
                  formatSubstrate(v, { compact: false })
                : "";
            postRunPrevAnimatedBossBonus = playPingOnIncrement(
              v,
              postRunPrevAnimatedBossBonus,
              1.15,
            );
          }

          // Repair cost: stagger 1.0s
          if (postRunRepairText.visible) {
            const v = animCountUp(repair, el, 1.0, 0.6);
            postRunRepairText.text =
              v !== null
                ? strings.postRun.repairLabel +
                  ": -" +
                  formatSubstrate(v, { compact: false })
                : "";
            postRunPrevAnimatedRepair = playPingOnIncrement(
              v,
              postRunPrevAnimatedRepair,
              0.95,
            );
          }

          // Net: stagger 1.3s — pitch reflects positive/negative outcome
          if (postRunNetText.visible) {
            const v = animCountUp(net, el, 1.3, 0.6);
            if (v !== null) {
              const netSign = net >= 0 ? "+" : "";
              postRunNetText.text =
                strings.postRun.netLabel +
                ": " +
                netSign +
                formatSubstrate(v, { compact: false });
            } else {
              postRunNetText.text = "";
            }
            postRunPrevAnimatedNet = playPingOnIncrement(
              v,
              postRunPrevAnimatedNet,
              net >= 0 ? 1.12 : 0.88,
            );
          }

          // New balance: stagger 1.6s
          if (postRunBalanceText.visible) {
            const v = animCountUp(balanceForHeadline, el, 1.6, 0.6);
            postRunBalanceText.text =
              v !== null
                ? strings.postRun.balanceLabel +
                  ": " +
                  formatSubstrate(v, { compact: false })
                : "";
            postRunPrevAnimatedBalance = playPingOnIncrement(
              v,
              postRunPrevAnimatedBalance,
              1.05,
            );
          }

          // Debt: stagger 1.9s (only visible when debt > 0)
          if (postRunDebtText.visible) {
            const v = animCountUp(debt, el, 1.9, 0.4);
            postRunDebtText.text =
              v !== null
                ? strings.postRun.debtLabel +
                  ": " +
                  formatSubstrate(v, { compact: false })
                : "";
            postRunPrevAnimatedDebt = playPingOnIncrement(
              v,
              postRunPrevAnimatedDebt,
              0.9,
            );
          }
        }
      }

      retryText.localPos = vec2(0, Math.floor(mainCanvasSize.y * 0.42));
      retryText.visible = (timeReal * 2) % 2 < 1.2;
    },
  };
}
