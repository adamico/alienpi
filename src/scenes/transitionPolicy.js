import { GAME_STATES } from "../config.js";

const { TITLE, LORE, HOME, PLAYING, PAUSE, POST_RUN, SETTINGS, CREDITS } =
  GAME_STATES;

export const SCENE_TRANSITIONS = {
  [TITLE]: {
    canTransitionTo: [LORE, SETTINGS, CREDITS],
    meta: { pauseOnEnter: true },
  },
  [LORE]: {
    canTransitionTo: [HOME],
    meta: { pauseOnEnter: true },
  },
  [HOME]: {
    canTransitionTo: [PLAYING, TITLE],
    meta: { pauseOnEnter: true },
  },
  [PLAYING]: {
    canTransitionTo: [PAUSE, POST_RUN],
    meta: { pauseOnEnter: false },
  },
  [PAUSE]: {
    canTransitionTo: [PLAYING, SETTINGS],
    meta: { pauseOnEnter: true },
  },
  [SETTINGS]: {
    canTransitionTo: [TITLE, HOME, PAUSE],
    meta: { modal: true, returnWithPop: true },
  },
  [CREDITS]: {
    canTransitionTo: [TITLE],
    meta: { pauseOnEnter: true },
  },
  [POST_RUN]: {
    canTransitionTo: [HOME],
    meta: { pauseOnEnter: true, minDuration: 1.0 },
  },
};
