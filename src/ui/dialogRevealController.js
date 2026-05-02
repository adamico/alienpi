import { Timer } from "../engine.js";

export function createDialogRevealController({ title, revealCfg, bodyTypewriter }) {
  let titleTyped = "";
  let typeTimer = null;
  let promptStartTime = null;
  let bodyState = bodyTypewriter.getState(0);

  function getRenderModel(now) {
    const promptReady = promptStartTime !== null && now >= promptStartTime;
    const blinkPhase = promptReady
      ? ((now - promptStartTime) * revealCfg.promptBlinkHz) % 1
      : 0;

    return {
      titleText: titleTyped,
      bodyPartIndex: bodyState.partIndex,
      bodyRevealedChars: bodyState.revealedChars,
      bodyWipeProgress: bodyState.wipeProgress,
      showStartPrompt: promptReady
        ? blinkPhase < revealCfg.promptBlinkDutyCycle
        : false,
      showSkipPrompt: !promptReady,
      promptReady,
    };
  }

  function reset(now) {
    titleTyped = "";
    promptStartTime = null;
    bodyTypewriter.reset();
    bodyState = bodyTypewriter.getState(now);
    typeTimer = new Timer(revealCfg.titleCharInterval, true);
    return getRenderModel(now);
  }

  function update(now) {
    if (typeTimer && typeTimer.elapsed()) {
      titleTyped += title.charAt(titleTyped.length);
      if (titleTyped.length < title.length) {
        typeTimer.set(revealCfg.titleCharInterval);
      } else {
        typeTimer = null;
        bodyTypewriter.start(now + revealCfg.titleToBodyDelay);
        bodyState = bodyTypewriter.getState(now);
      }
    }

    bodyState = bodyTypewriter.update(now);
    if (bodyState.done && promptStartTime === null) {
      promptStartTime = now + revealCfg.promptDelay;
    }

    return getRenderModel(now);
  }

  function completeTitleImmediately(now) {
    titleTyped = title;
    typeTimer = null;
    bodyTypewriter.start(now);
    bodyState = bodyTypewriter.getState(now);
  }

  function skipBody(now) {
    bodyState = bodyTypewriter.skip(now);
    if (bodyState.done && promptStartTime === null) {
      promptStartTime = now + revealCfg.promptDelay;
    }
  }

  function forcePromptReady(now) {
    if (promptStartTime !== null && now < promptStartTime) {
      promptStartTime = now;
    }
  }

  function confirm(now) {
    const promptReady = promptStartTime !== null && now >= promptStartTime;
    if (promptReady) {
      return { advance: true, state: getRenderModel(now) };
    }

    if (typeTimer) {
      completeTitleImmediately(now);
      skipBody(now);
      return { advance: false, state: getRenderModel(now) };
    }

    if (!bodyTypewriter.isDone()) {
      skipBody(now);
      return { advance: false, state: getRenderModel(now) };
    }

    forcePromptReady(now);
    return { advance: false, state: getRenderModel(now) };
  }

  return {
    reset,
    update,
    confirm,
    getRenderModel,
  };
}
