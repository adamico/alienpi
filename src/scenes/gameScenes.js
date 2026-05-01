import { GAME_STATES } from "../config.js";
import { BaseScene } from "./baseScene.js";
import {
  SCENE_ACTION,
  hasSceneAction,
  dispatchMenuFromSceneActions,
} from "./sceneActions.js";

class TitleScene extends BaseScene {
  constructor({ menus }) {
    super(GAME_STATES.TITLE);
    this.menus = menus;
  }

  handleFrame(actions) {
    return dispatchMenuFromSceneActions(this.menus.titleMenu, actions);
  }
}

class LoreScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.LORE);
    this.transitionTo = transitionTo;
  }

  handleFrame(actions) {
    if (
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      this.transitionTo(GAME_STATES.HOME, {}, "lore:confirm");
      return true;
    }
    return false;
  }
}

class HomeScene extends BaseScene {
  constructor({ transitionTo, resetGame, setPaused }) {
    super(GAME_STATES.HOME);
    this.transitionTo = transitionTo;
    this.resetGame = resetGame;
    this.setPaused = setPaused;
  }

  handleFrame(actions) {
    if (
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      this.resetGame();
      this.setPaused(false);
      return true;
    }

    if (hasSceneAction(actions, SCENE_ACTION.CANCEL)) {
      this.transitionTo(GAME_STATES.TITLE, {}, "home:cancel");
      this.setPaused(true);
      return true;
    }

    return false;
  }
}

class PlayingScene extends BaseScene {
  constructor({ transitionTo, setPaused }) {
    super(GAME_STATES.PLAYING);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.PAUSE)) {
      this.transitionTo(GAME_STATES.PAUSE, {}, "playing:pause");
      this.setPaused(true);
      return true;
    }
    return false;
  }
}

class PauseScene extends BaseScene {
  constructor({ transitionTo, setPaused, menus }) {
    super(GAME_STATES.PAUSE);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
    this.menus = menus;
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.PAUSE)) {
      this.transitionTo(GAME_STATES.PLAYING, {}, "pause:resume-key");
      this.setPaused(false);
      return true;
    }

    return dispatchMenuFromSceneActions(this.menus.pauseMenu, actions);
  }
}

class SettingsScene extends BaseScene {
  constructor({ popState, menus }) {
    super(GAME_STATES.SETTINGS);
    this.popState = popState;
    this.menus = menus;
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.CANCEL)) {
      this.popState({}, "settings:cancel");
      return true;
    }

    return dispatchMenuFromSceneActions(this.menus.settingsMenu, actions);
  }
}

class CreditsScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.CREDITS);
    this.transitionTo = transitionTo;
  }

  handleFrame(actions) {
    if (
      hasSceneAction(actions, SCENE_ACTION.CANCEL) ||
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      this.transitionTo(GAME_STATES.TITLE, {}, "credits:dismiss");
      return true;
    }

    return false;
  }
}

class PostRunScene extends BaseScene {
  constructor({ transitionTo, getTimeReal, getGameOverTime }) {
    super(GAME_STATES.POST_RUN);
    this.transitionTo = transitionTo;
    this.getTimeReal = getTimeReal;
    this.getGameOverTime = getGameOverTime;
  }

  handleFrame(actions) {
    if (this.getTimeReal() - this.getGameOverTime() <= 1.0) return false;

    if (
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.CANCEL) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      this.transitionTo(GAME_STATES.HOME, {}, "post-run:advance");
      return true;
    }

    return false;
  }
}

export function createGameScenes(deps) {
  const scenes = [
    new TitleScene(deps),
    new LoreScene(deps),
    new HomeScene(deps),
    new PlayingScene(deps),
    new PauseScene(deps),
    new SettingsScene(deps),
    new CreditsScene(deps),
    new PostRunScene(deps),
  ];

  return new Map(scenes.map((scene) => [scene.getId(), scene]));
}
