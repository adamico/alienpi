import { GAME_STATES } from "./config/index.js";
import { getGameState } from "./game/world.js";
import { transitionTo } from "./scenes/gameSceneManager.js";

function autoPauseIfPlaying(reason) {
  if (getGameState() !== GAME_STATES.PLAYING) return;
  transitionTo(GAME_STATES.PAUSE, {}, reason);
}

export function installAutoPause() {
  window.addEventListener("blur", () => autoPauseIfPlaying("autopause:blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      autoPauseIfPlaying("autopause:hidden");
    }
  });
}
