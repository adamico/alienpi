import { GAME_STATES, system } from "../config.js";
import { engineObjects, engineObjectsDestroy, setPaused, timeReal } from "../engine.js";
import { tickDPSLog, setEnemyCount } from "../dpsTracker.js";
import { resetScore, commitHighScore } from "../score.js";
import { beginRun, commitRun } from "../economy.js";
import { vibrate } from "../gamepad.js";
import { setupBoundaries } from "../scene.js";
import {
  soundTitleMusic,
  soundBossMusic,
  soundVictoryMusic,
  soundGameOverMusic,
  soundGameOverJingle,
} from "../sounds.js";
import {
  getPlayer,
  getCurrentBoss,
  initializePlayer,
  spawnBoss,
  tickGameTime,
  resetGameTime,
} from "../world.js";
import { titleMenu, pauseMenu, settingsMenu } from "../menus.js";
import { BaseScene } from "./baseScene.js";

import {
  SCENE_ACTION,
  hasSceneAction,
  dispatchMenuFromSceneActions,
} from "./sceneActions.js";

function destroyPlayfield() {
  system.isResetting = true;
  engineObjectsDestroy();
  system.isResetting = false;
}

class TitleScene extends BaseScene {
  constructor() {
    super(GAME_STATES.TITLE);
  }

  enter() {
    setPaused(true);
  }

  getMusic() {
    return soundTitleMusic;
  }

  handleFrame(actions) {
    return dispatchMenuFromSceneActions(titleMenu, actions);
  }
}

class LoreScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.LORE);
    this.transitionTo = transitionTo;
  }

  enter() {
    setPaused(true);
  }

  getMusic() {
    return soundTitleMusic;
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
  constructor({ transitionTo }) {
    super(GAME_STATES.HOME);
    this.transitionTo = transitionTo;
  }

  enter() {
    setPaused(true);
  }

  getMusic() {
    return soundTitleMusic;
  }

  handleFrame(actions) {
    if (
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      destroyPlayfield();
      initializePlayer();
      spawnBoss();
      setupBoundaries();
      resetGameTime();
      resetScore();
      beginRun();
      this.transitionTo(GAME_STATES.PLAYING, { gameWon: false }, "run:start");
      return true;
    }

    if (hasSceneAction(actions, SCENE_ACTION.CANCEL)) {
      this.transitionTo(GAME_STATES.TITLE, {}, "home:cancel");
      return true;
    }

    return false;
  }
}

class PlayingScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.PLAYING);
    this.transitionTo = transitionTo;
  }

  enter() {
    setPaused(false);
  }

  getMusic() {
    return soundBossMusic;
  }

  update(dt) {
    tickGameTime(dt);
    if (system.enableDPSLog) {
      setEnemyCount(engineObjects.filter((o) => o.isEnemy).length);
      tickDPSLog();
    }

    const player = getPlayer();
    const boss = getCurrentBoss();
    if (player && player.hp <= 0) {
      this._postRun("defeat");
      vibrate(800, 1.0, 1.0);
    } else if (boss && boss.destroyed) {
      this._postRun("victory");
      vibrate(400, 0.6, 0.4);
    }
  }

  // Wipe the playfield on run end: pause halts updates but particles and
  // child emitters that were live in the last frame stay resident and pile up
  // across replays. Destroying everything lets GC reclaim them and keeps the
  // debrief overlay rendering over a clean field.
  _postRun(outcome) {
    const gameWon = outcome === "victory";
    const gameOverTime = timeReal;
    commitHighScore();
    const lastRunDebrief = commitRun(outcome);
    this.transitionTo(
      GAME_STATES.POST_RUN,
      { gameWon, lastRunDebrief, gameOverTime, outcome },
      "run:post",
    );
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.PAUSE)) {
      this.transitionTo(GAME_STATES.PAUSE, {}, "playing:pause");
      return true;
    }
    return false;
  }
}

class PauseScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.PAUSE);
    this.transitionTo = transitionTo;
  }

  enter() {
    setPaused(true);
  }

  getMusic() {
    return soundBossMusic;
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.PAUSE)) {
      this.transitionTo(GAME_STATES.PLAYING, {}, "pause:resume-key");
      return true;
    }

    return dispatchMenuFromSceneActions(pauseMenu, actions);
  }
}

class SettingsScene extends BaseScene {
  constructor({ popState }) {
    super(GAME_STATES.SETTINGS);
    this.popState = popState;
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.CANCEL)) {
      this.popState({}, "settings:cancel");
      return true;
    }

    return dispatchMenuFromSceneActions(settingsMenu, actions);
  }
}

class CreditsScene extends BaseScene {
  constructor({ transitionTo }) {
    super(GAME_STATES.CREDITS);
    this.transitionTo = transitionTo;
  }

  enter() {
    setPaused(true);
  }

  getMusic() {
    return soundTitleMusic;
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
  constructor({ transitionTo }) {
    super(GAME_STATES.POST_RUN);
    this.transitionTo = transitionTo;
    this.gameOverTime = 0;
  }

  enter({ context }) {
    this.gameOverTime = context.gameOverTime;
    soundGameOverJingle.play();
    destroyPlayfield();
    setPaused(true);
  }

  getMusic(context) {
    return context.gameWon ? soundVictoryMusic : soundGameOverMusic;
  }

  handleFrame(actions) {
    if (timeReal - this.gameOverTime <= 1.0) return false;

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
