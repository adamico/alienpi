import { vec2 } from "../engine.js";
import { GAME_STATES } from "../config.js";
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
