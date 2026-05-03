import { vec2 } from "../engine.js";
import { GAME_STATES } from "../config/index.js";
import { setDesiredMusic } from "../audio/soundManager.js";
import { resetTutorialProgress } from "../game/tutorialProgress.js";
import {
  setGameState,
  setGameWon,
  setLastRunDebrief,
  getGameWon,
  getLastRunDebrief,
} from "../game/world.js";
import { SceneContext } from "./sceneContext.js";
import { SceneManager } from "./sceneManager.js";
import { SCENE_TRANSITIONS } from "./transitionPolicy.js";
import { createSceneActionCollector } from "./sceneActions.js";
import { createGameScenes } from "./gameScenes.js";
import { initUI } from "../ui.js";
import { beginSceneWipe } from "../visuals/sceneTransition.js";

// Pause toggles should be instantaneous; everything else gets the wipe.
const SKIP_WIPE_PAIRS = new Set([
  `${GAME_STATES.PLAYING}->${GAME_STATES.PAUSE}`,
  `${GAME_STATES.PAUSE}->${GAME_STATES.PLAYING}`,
]);

function shouldWipe(from, to) {
  return !SKIP_WIPE_PAIRS.has(`${from}->${to}`);
}

const sceneContext = new SceneContext({
  gameWon: getGameWon(),
  lastRunDebrief: getLastRunDebrief(),
  gameOverTime: 0,
  previousState: GAME_STATES.TITLE,
});

export const sceneManager = new SceneManager({
  initialState: GAME_STATES.TITLE,
  transitionPolicy: SCENE_TRANSITIONS,
  context: sceneContext,
});

const _transitionTo = sceneManager.transitionTo.bind(sceneManager);
const _pushState = sceneManager.pushState.bind(sceneManager);
const _popState = sceneManager.popState.bind(sceneManager);

export function transitionTo(nextState, payload, reason) {
  if (!sceneManager.canTransitionTo(nextState)) return false;
  if (!shouldWipe(sceneManager.getState(), nextState)) {
    return _transitionTo(nextState, payload, reason);
  }
  beginSceneWipe(() => _transitionTo(nextState, payload, reason));
  return true;
}

export function pushState(nextState, payload, reason) {
  if (!sceneManager.canTransitionTo(nextState)) return false;
  if (!shouldWipe(sceneManager.getState(), nextState)) {
    return _pushState(nextState, payload, reason);
  }
  beginSceneWipe(() => _pushState(nextState, payload, reason));
  return true;
}

export function popState(payload, reason) {
  beginSceneWipe(() => _popState(payload, reason));
  return true;
}
export const collectSceneActions = createSceneActionCollector({ vec2 });

const scenes = createGameScenes({ transitionTo, pushState, popState });

for (const scene of scenes.values()) {
  sceneManager.registerScene(scene);
}

sceneManager.subscribe(({ to, context }) => {
  setGameState(to);
  setGameWon(context.gameWon);
  setLastRunDebrief(context.lastRunDebrief);
  setDesiredMusic(scenes.get(to)?.getMusic(context));
});

export function updateSceneFrame(dt) {
  const { actions } = collectSceneActions();
  sceneManager.updateFrame({ actions, dt });
}

export function initUIHandlers() {
  initUI({
    handlers: {
      title: {
        start: () => transitionTo(GAME_STATES.LORE, {}, "title:start"),
        openSettings: () =>
          pushState(GAME_STATES.SETTINGS, {}, "title:open-settings"),
        openCredits: () =>
          transitionTo(GAME_STATES.CREDITS, {}, "title:open-credits"),
        replayTutorial: () => {
          resetTutorialProgress();
          transitionTo(GAME_STATES.TUTORIAL, {}, "title:replay-tutorial");
        },
        openTestLab: () =>
          transitionTo(GAME_STATES.TEST_LAB, {}, "title:open-test-lab"),
      },
      pause: {
        resume: () => transitionTo(GAME_STATES.PLAYING, {}, "pause:resume"),
      },
      settings: {
        back: () => popState({}, "settings:back"),
      },
    },
  });
}
