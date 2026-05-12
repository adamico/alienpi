import { rgb, mainCanvasSize, Color, timeReal } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { formatHighScore, getScore } from "../game/score.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle, makeCenterLine } from "./uiText.js";
import { playSfx } from "../audio/soundManager.js";
import { makeFooterHints } from "./footerHints.js";
import { soundScorePing } from "../audio/sounds.js";

const COLOR_WHITE = new Color(1, 1, 1, 1);
const COLOR_DEFEAT = rgb(1, 0.2, 0.2);
const COLOR_VICTORY = rgb(0.4, 1, 0.4);
const COLOR_HIGHLIGHT = rgb(1, 0.85, 0.3);

function animCountUp(target, elapsed, startAt, dur) {
  if (elapsed < startAt) return null;
  const t = Math.min((elapsed - startAt) / dur, 1);
  const ease = 1 - (1 - t) ** 2;
  return Math.round(target * ease);
}

export function createRunScreens(uiRoot) {
  const postRunGroup = makePanel(uiRoot);
  const postRunTitleText = makeCenterTitle(
    postRunGroup,
    -120,
    strings.postRun.defeatTitle,
    { textHeight: 80, color: COLOR_DEFEAT, shadow: false },
  );
  const finalScoreText = makeCenterTitle(postRunGroup, 20, "", {
    textHeight: 60,
    color: COLOR_WHITE,
    shadow: false,
  });
  const highScoreText = makeCenterLine(postRunGroup, 90, "", {
    boxHeight: 40,
    textHeight: 26,
    color: COLOR_HIGHLIGHT,
    shadow: false,
  });
  const postRunFooter = makeFooterHints(postRunGroup, [
    { action: "confirm", label: strings.postRun.continuePrompt },
  ]);

  let postRunCacheWon = null;
  let postRunCacheScore = NaN;
  let postRunAnimStartTime = NaN;
  let postRunPrevAnimatedScore = NaN;
  let postRunNextScorePingTime = 0;

  function playPingOnIncrement(currentValue, prevValue, pitch = 1.05) {
    if (currentValue === null || currentValue === prevValue) return prevValue;
    if (timeReal < postRunNextScorePingTime) return prevValue;
    postRunNextScorePingTime = timeReal + 0.05;
    playSfx(soundScorePing, undefined, 0.35, pitch);
    return currentValue;
  }

  return {
    postRunGroup,
    setPostRunVisible(visible) {
      postRunGroup.visible = visible;
      if (!visible) {
        postRunCacheWon = null;
        postRunCacheScore = NaN;
        postRunAnimStartTime = NaN;
        postRunPrevAnimatedScore = NaN;
        postRunNextScorePingTime = 0;
      }
    },
    tick(gameState, { gameWon } = {}) {
      this.setPostRunVisible(gameState === GAME_STATES.POST_RUN);
      if (postRunGroup.visible) this.updatePostRun({ gameWon });
    },
    updatePostRun({ gameWon }) {
      postRunGroup.size = mainCanvasSize;
      const score = getScore();
      const shouldRefresh =
        postRunCacheWon !== gameWon || postRunCacheScore !== score;

      if (shouldRefresh) {
        postRunCacheWon = gameWon;
        postRunCacheScore = score;

        if (gameWon) {
          postRunTitleText.text = strings.postRun.victoryTitle;
          postRunTitleText.textColor = COLOR_VICTORY.copy();
        } else {
          postRunTitleText.text = strings.postRun.defeatTitle;
          postRunTitleText.textColor = COLOR_DEFEAT.copy();
        }
        highScoreText.text =
          strings.title.highScorePrefix + formatHighScore();

        postRunAnimStartTime = timeReal;
        postRunPrevAnimatedScore = NaN;
        postRunNextScorePingTime = timeReal;
      }

      if (!isNaN(postRunAnimStartTime)) {
        const el = timeReal - postRunAnimStartTime;
        const animScore = animCountUp(score, el, 0.0, 1.2);
        if (animScore !== null) {
          finalScoreText.text =
            strings.postRun.finalScorePrefix + animScore.toLocaleString("en-US");
        }
        postRunPrevAnimatedScore = playPingOnIncrement(
          animScore,
          postRunPrevAnimatedScore,
          1.05,
        );
        highScoreText.visible = el >= 1.2;
      }
      postRunFooter.refresh();
    },
  };
}
