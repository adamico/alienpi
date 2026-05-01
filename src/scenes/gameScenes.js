import { GAME_STATES } from "../config.js";
import { BaseScene } from "./baseScene.js";
import {
  SCENE_ACTION,
  hasSceneAction,
  dispatchMenuFromSceneActions,
} from "./sceneActions.js";

class TitleScene extends BaseScene {
  constructor({ menus, setPaused }) {
    super(GAME_STATES.TITLE);
    this.menus = menus;
    this.setPaused = setPaused;
  }

  enter() {
    this.setPaused(true);
  }

  handleFrame(actions) {
    return dispatchMenuFromSceneActions(this.menus.titleMenu, actions);
  }
}

class LoreScene extends BaseScene {
  constructor({ transitionTo, setPaused }) {
    super(GAME_STATES.LORE);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
  }

  enter() {
    this.setPaused(true);
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
  constructor({ transitionTo, setPaused, destroyPlayfield, initializePlayer, spawnBoss, setupBoundaries, resetGameTime, resetScore, beginRun }) {
    super(GAME_STATES.HOME);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
    this.destroyPlayfield = destroyPlayfield;
    this.initializePlayer = initializePlayer;
    this.spawnBoss = spawnBoss;
    this.setupBoundaries = setupBoundaries;
    this.resetGameTime = resetGameTime;
    this.resetScore = resetScore;
    this.beginRun = beginRun;
  }

  enter() {
    this.setPaused(true);
  }

  handleFrame(actions) {
    if (
      hasSceneAction(actions, SCENE_ACTION.CONFIRM) ||
      hasSceneAction(actions, SCENE_ACTION.POINTER_SELECT)
    ) {
      this.destroyPlayfield();
      this.initializePlayer();
      this.spawnBoss();
      this.setupBoundaries();
      this.resetGameTime();
      this.resetScore();
      this.beginRun();
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
  constructor({ transitionTo, setPaused, getPlayer, getCurrentBoss, getTimeReal, commitHighScore, commitRun, vibrate, onTick, onDPSTick }) {
    super(GAME_STATES.PLAYING);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
    this.getPlayer = getPlayer;
    this.getCurrentBoss = getCurrentBoss;
    this.getTimeReal = getTimeReal;
    this.commitHighScore = commitHighScore;
    this.commitRun = commitRun;
    this.vibrate = vibrate;
    this.onTick = onTick;
    this.onDPSTick = onDPSTick;
  }

  enter() {
    this.setPaused(false);
  }

  update(dt) {
    this.onTick(dt);
    if (this.onDPSTick) this.onDPSTick();

    const player = this.getPlayer();
    const boss = this.getCurrentBoss();
    if (player && player.hp <= 0) {
      this._postRun("defeat");
      this.vibrate(800, 1.0, 1.0);
    } else if (boss && boss.destroyed) {
      this._postRun("victory");
      this.vibrate(400, 0.6, 0.4);
    }
  }

  // Wipe the playfield on run end: pause halts updates but particles and
  // child emitters that were live in the last frame stay resident and pile up
  // across replays. Destroying everything lets GC reclaim them and keeps the
  // debrief overlay rendering over a clean field.
  _postRun(outcome) {
    const gameWon = outcome === "victory";
    const gameOverTime = this.getTimeReal();
    this.commitHighScore();
    const lastRunDebrief = this.commitRun(outcome);
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
  constructor({ transitionTo, setPaused, menus }) {
    super(GAME_STATES.PAUSE);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
    this.menus = menus;
  }

  enter() {
    this.setPaused(true);
  }

  handleFrame(actions) {
    if (hasSceneAction(actions, SCENE_ACTION.PAUSE)) {
      this.transitionTo(GAME_STATES.PLAYING, {}, "pause:resume-key");
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
  constructor({ transitionTo, setPaused }) {
    super(GAME_STATES.CREDITS);
    this.transitionTo = transitionTo;
    this.setPaused = setPaused;
  }

  enter() {
    this.setPaused(true);
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
  constructor({
    transitionTo,
    getTimeReal,
    getGameOverTime,
    soundGameOverJingle,
    destroyPlayfield,
    setPaused,
  }) {
    super(GAME_STATES.POST_RUN);
    this.transitionTo = transitionTo;
    this.getTimeReal = getTimeReal;
    this.getGameOverTime = getGameOverTime;
    this.soundGameOverJingle = soundGameOverJingle;
    this.destroyPlayfield = destroyPlayfield;
    this.setPaused = setPaused;
  }

  enter() {
    this.soundGameOverJingle.play();
    this.destroyPlayfield();
    this.setPaused(true);
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
