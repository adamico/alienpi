import { vec2, rgb, UIObject, UIText, mainCanvasSize, Color, timeReal } from "../engine.js";
import { strings } from "../config.js";
import { FONT_MENU } from "../fonts.js";
import { formatHighScore } from "../score.js";
import {
  getSubstrate,
  getDebt,
  getLastRun,
  formatSubstrate,
} from "../economy.js";

function makeDebriefLine(parent, y, label, color = new Color(1, 1, 1, 1)) {
  const text = new UIText(vec2(0, y), vec2(800, 32), label);
  text.textHeight = 24;
  text.font = FONT_MENU;
  text.textColor = color.copy();
  text.fontShadow = true;
  parent.addChild(text);
  return text;
}

export function createEconomyScreens(uiRoot) {
  const homeGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  homeGroup.color = new Color(0.04, 0.06, 0.12, 0.85);
  homeGroup.lineWidth = 0;
  uiRoot.addChild(homeGroup);

  const homeTitleText = new UIText(
    vec2(0, -160),
    vec2(800, 100),
    strings.ui.homeTitle,
  );
  homeTitleText.textHeight = 70;
  homeTitleText.font = FONT_MENU;
  homeTitleText.textColor = rgb(0.4, 0.9, 1);
  homeTitleText.fontShadow = true;
  homeGroup.addChild(homeTitleText);

  const homeBalanceText = makeDebriefLine(
    homeGroup,
    -40,
    strings.ui.homeBalanceLabel,
    rgb(0.4, 1, 0.7),
  );
  const homeDebtText = makeDebriefLine(
    homeGroup,
    0,
    strings.ui.homeDebtLabel,
    rgb(1, 0.5, 0.3),
  );
  const homeLastRunText = makeDebriefLine(
    homeGroup,
    40,
    strings.ui.homeLastRunLabel,
    new Color(0.85, 0.85, 0.85, 1),
  );

  const homeLaunchText = new UIText(
    vec2(0, 130),
    vec2(800, 50),
    strings.ui.homeLaunchPrompt,
  );
  homeLaunchText.textHeight = 28;
  homeLaunchText.font = FONT_MENU;
  homeLaunchText.textColor = new Color(1, 1, 1, 1);
  homeLaunchText.fontShadow = true;
  homeGroup.addChild(homeLaunchText);

  const homeExitText = new UIText(
    vec2(0, 180),
    vec2(800, 32),
    strings.ui.homeExitPrompt,
  );
  homeExitText.textHeight = 18;
  homeExitText.font = FONT_MENU;
  homeExitText.textColor = new Color(0.7, 0.7, 0.7, 1);
  homeExitText.fontShadow = true;
  homeGroup.addChild(homeExitText);

  const postRunGroup = new UIObject(vec2(0, 0), mainCanvasSize);
  postRunGroup.color = new Color(0, 0, 0, 0);
  postRunGroup.lineWidth = 0;
  uiRoot.addChild(postRunGroup);

  const postRunTitleText = new UIText(
    vec2(0, -90),
    vec2(800, 100),
    strings.ui.gameOverTitle,
  );
  postRunTitleText.textHeight = 80;
  postRunTitleText.font = FONT_MENU;
  postRunTitleText.textColor = rgb(1, 0.2, 0.2);
  postRunTitleText.fontShadow = false;
  postRunGroup.addChild(postRunTitleText);

  const retryText = new UIText(
    vec2(0, 60),
    vec2(800, 50),
    strings.ui.retryPrompt,
  );
  retryText.textHeight = 24;
  retryText.font = FONT_MENU;
  retryText.textColor = new Color(1, 1, 1, 1);
  retryText.fontShadow = false;

  const backToTitleText = new UIText(vec2(0, 100), vec2(800, 40), "");
  backToTitleText.textHeight = 18;
  backToTitleText.font = FONT_MENU;
  backToTitleText.textColor = new Color(0.7, 0.7, 0.7, 1);
  backToTitleText.fontShadow = false;
  backToTitleText.visible = false;

  const finalScoreText = new UIText(
    vec2(0, 0),
    vec2(800, 100),
    strings.ui.finalScorePrefix,
  );
  finalScoreText.textHeight = 60;
  finalScoreText.font = FONT_MENU;
  finalScoreText.textColor = rgb(1, 1, 1);
  finalScoreText.fontShadow = false;

  const gameOverHighScoreText = new UIText(
    vec2(0, 35),
    vec2(800, 40),
    strings.ui.highScorePrefix + formatHighScore(),
  );
  gameOverHighScoreText.textHeight = 26;
  gameOverHighScoreText.font = FONT_MENU;
  gameOverHighScoreText.textColor = rgb(1, 0.85, 0.3);
  gameOverHighScoreText.fontShadow = false;

  postRunGroup.addChild(finalScoreText);
  postRunGroup.addChild(gameOverHighScoreText);
  postRunGroup.addChild(retryText);
  postRunGroup.addChild(backToTitleText);

  const postRunEarningsText = makeDebriefLine(postRunGroup, 80, "");
  postRunEarningsText.fontShadow = false;
  const postRunBossBonusText = makeDebriefLine(
    postRunGroup,
    110,
    "",
    rgb(1, 0.85, 0.3),
  );
  postRunBossBonusText.fontShadow = false;
  const postRunRepairText = makeDebriefLine(
    postRunGroup,
    140,
    "",
    rgb(1, 0.5, 0.3),
  );
  postRunRepairText.fontShadow = false;
  const postRunNetText = makeDebriefLine(
    postRunGroup,
    175,
    "",
    rgb(0.4, 1, 0.7),
  );
  postRunNetText.fontShadow = false;
  postRunNetText.textHeight = 28;
  const postRunBalanceText = makeDebriefLine(
    postRunGroup,
    215,
    "",
    rgb(0.4, 1, 0.7),
  );
  postRunBalanceText.fontShadow = false;
  const postRunDebtText = makeDebriefLine(
    postRunGroup,
    245,
    "",
    rgb(1, 0.5, 0.3),
  );
  postRunDebtText.fontShadow = false;

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
    setHomeVisible(visible) {
      homeGroup.visible = visible;
    },
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
          last.net >= 0
            ? new Color(0.4, 1, 0.7, 1)
            : new Color(1, 0.5, 0.3, 1);
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
          postRunTitleText.textColor = rgb(0.4, 1, 0.4);
        } else {
          postRunTitleText.text = strings.ui.postRunDefeatTitle;
          postRunTitleText.textColor = rgb(1, 0.2, 0.2);
        }
        retryText.text = strings.ui.postRunContinuePrompt;
        finalScoreText.text =
          strings.ui.postRunSubstratePrefix +
          formatSubstrate(balanceForHeadline, { compact: false });
        finalScoreText.textColor = rgb(0.4, 1, 0.7);
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
            debrief.net >= 0 ? rgb(0.4, 1, 0.7) : rgb(1, 0.5, 0.3);
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