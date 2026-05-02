function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function createMultipartTypewriter({
  parts,
  charInterval,
  holdDelay,
  wipeDuration,
  afterWipeDelay,
  skipTransitionMode = "next-full",
}) {
  const safeParts = Array.isArray(parts) ? parts : [];
  const lastPartIndex = Math.max(0, safeParts.length - 1);

  let phase = "idle";
  let partIndex = 0;
  let revealedChars = 0;
  let phaseStartTime = 0;

  function getCurrentPartText() {
    return safeParts[partIndex] ?? "";
  }

  function getWipeProgress(now) {
    if (phase !== "wiping") return 0;
    if (wipeDuration <= 0) return 1;
    return clamp01((now - phaseStartTime) / wipeDuration);
  }

  function getState(now) {
    return {
      phase,
      partIndex,
      revealedChars,
      wipeProgress: getWipeProgress(now),
      started: phase !== "idle",
      done: phase === "done",
    };
  }

  function reset() {
    phase = "idle";
    partIndex = 0;
    revealedChars = 0;
    phaseStartTime = 0;
  }

  function start(startTime) {
    if (!safeParts.length) {
      phase = "done";
      return;
    }

    phase = "typing";
    partIndex = 0;
    revealedChars = 0;
    phaseStartTime = startTime;
  }

  function advanceTransition(now) {
    if (phase === "holding") {
      if (now - phaseStartTime >= holdDelay) {
        phase = "wiping";
        phaseStartTime = now;
      }
      return;
    }

    if (phase === "wiping") {
      const progress = getWipeProgress(now);
      if (progress >= 1) {
        partIndex = Math.min(lastPartIndex, partIndex + 1);
        revealedChars = 0;
        phase = "waiting-next";
        phaseStartTime = now;
      }
      return;
    }

    if (phase === "waiting-next" && now - phaseStartTime >= afterWipeDelay) {
      phase = "typing";
      phaseStartTime = now;
    }
  }

  function update(now) {
    if (phase === "idle" || phase === "done") return getState(now);

    if (phase === "typing") {
      const currentText = getCurrentPartText();
      const elapsed = Math.max(0, now - phaseStartTime);
      const chars = charInterval > 0
        ? Math.floor(elapsed / charInterval)
        : currentText.length;
      revealedChars = Math.min(currentText.length, chars);

      if (revealedChars >= currentText.length) {
        if (partIndex < lastPartIndex) {
          phase = "holding";
          phaseStartTime = now;
        } else {
          phase = "done";
        }
      }
    } else {
      advanceTransition(now);
    }

    return getState(now);
  }

  function skip(now) {
    if (phase === "idle") {
      start(now);
    }

    if (phase === "done") return getState(now);

    if (phase === "typing") {
      revealedChars = getCurrentPartText().length;
      if (partIndex < lastPartIndex) {
        phase = "holding";
        phaseStartTime = now;
      } else {
        phase = "done";
      }
      return getState(now);
    }

    if (phase === "holding" || phase === "wiping" || phase === "waiting-next") {
      if (partIndex >= lastPartIndex) {
        phase = "done";
        revealedChars = getCurrentPartText().length;
        return getState(now);
      }

      partIndex = Math.min(lastPartIndex, partIndex + 1);
      if (skipTransitionMode === "next-full") {
        revealedChars = getCurrentPartText().length;
        phase = partIndex < lastPartIndex ? "holding" : "done";
        phaseStartTime = now;
      } else {
        revealedChars = 0;
        phase = "typing";
        phaseStartTime = now;
      }
    }

    return getState(now);
  }

  return {
    reset,
    start,
    update,
    skip,
    getState,
    isDone() {
      return phase === "done";
    },
    isStarted() {
      return phase !== "idle";
    },
  };
}
