export const HOLD_TO_ACTIVATE_SECONDS = 3;

export function getHoldCountdown(startedAt, now, seconds = HOLD_TO_ACTIVATE_SECONDS) {
  if (startedAt == null) return 0;
  const remaining = seconds - (now - startedAt);
  if (remaining <= 0) return 0;
  return Math.max(1, Math.ceil(remaining));
}

export function isHoldComplete(startedAt, now, seconds = HOLD_TO_ACTIVATE_SECONDS) {
  return startedAt != null && now - startedAt >= seconds;
}

export function createHoldToActivateController({
  isHolding,
  onComplete,
  seconds = HOLD_TO_ACTIVATE_SECONDS,
}) {
  let startedAt = null;
  let consumed = false;

  function clear() {
    startedAt = null;
    consumed = false;
  }

  function tick(now) {
    if (!isHolding()) {
      clear();
      return;
    }

    if (consumed) return;
    if (startedAt == null) startedAt = now;

    if (isHoldComplete(startedAt, now, seconds)) {
      consumed = true;
      startedAt = null;
      onComplete();
    }
  }

  function getLabel(now, idleLabel, holdLabel) {
    const countdown = getHoldCountdown(startedAt, now, seconds);
    return countdown > 0 ? `${holdLabel} ${countdown}` : idleLabel;
  }

  return {
    clear,
    tick,
    getLabel,
  };
}