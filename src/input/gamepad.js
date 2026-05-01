// Thin wrapper over the GamepadHapticActuator API. Silently no-ops when the
// browser/pad doesn't expose vibration so callers can fire-and-forget.
export function vibrate(duration = 200, weak = 0.5, strong = 0.5) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    const actuator = pad?.vibrationActuator;
    if (!actuator || !actuator.playEffect) continue;
    actuator
      .playEffect("dual-rumble", {
        duration,
        startDelay: 0,
        weakMagnitude: weak,
        strongMagnitude: strong,
      })
      .catch(() => {});
  }
}
