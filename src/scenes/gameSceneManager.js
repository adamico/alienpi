import { vec2 } from "../engine.js";
import { GAME_STATES } from "../config/index.js";
import { setDesiredMusic } from "../soundManager.js";
import {
  setGameState,
  setGameWon,
  setLastRunDebrief,
  getGameWon,
  getLastRunDebrief,
} from "../world.js";
import { SceneContext } from "./sceneContext.js";
import { SceneManager } from "./sceneManager.js";
import { SCENE_TRANSITIONS } from "./transitionPolicy.js";
import { createSceneActionCollector } from "./sceneActions.js";
import { createGameScenes } from "./gameScenes.js";
import { initUI } from "../ui.js";

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

export const transitionTo = sceneManager.transitionTo.bind(sceneManager);
export const pushState = sceneManager.pushState.bind(sceneManager);
export const popState = sceneManager.popState.bind(sceneManager);
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
