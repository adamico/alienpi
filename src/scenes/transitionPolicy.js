import { GAME_STATES } from "../config/index.js";

const {
  TITLE,
  LORE,
  HOME,
  PLAYING,
  PAUSE,
  POST_RUN,
  SETTINGS,
  CREDITS,
  TUTORIAL,
  TEST_LAB,
  ICON_DEBUG,
} = GAME_STATES;

export const SCENE_TRANSITIONS = {
  [TITLE]: {
    canTransitionTo: [
      LORE,
      SETTINGS,
      CREDITS,
      TUTORIAL,
      ...(DEV_BUILD ? [TEST_LAB, ICON_DEBUG] : []),
    ],
    meta: { pauseOnEnter: true },
  },
  [LORE]: {
    canTransitionTo: [HOME, TUTORIAL],
    meta: { pauseOnEnter: true },
  },
  [HOME]: {
    canTransitionTo: [PLAYING, TITLE],
    meta: { pauseOnEnter: true },
  },
  [TUTORIAL]: {
    canTransitionTo: [HOME, TITLE],
    meta: { pauseOnEnter: false },
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
  ...(DEV_BUILD
    ? {
        [TEST_LAB]: {
          canTransitionTo: [TITLE],
          meta: { pauseOnEnter: false },
        },
        [ICON_DEBUG]: {
          canTransitionTo: [TITLE],
          meta: { pauseOnEnter: true },
        },
      }
    : {}),
};
