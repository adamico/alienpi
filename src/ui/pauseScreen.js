import { Color, rgb, timeReal, mouseIsDown } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { actionDown } from "../input/bindings.js";
import { makeMenuRow } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
import { makeFooterHints } from "./footerHints.js";
import {
  HOLD_TO_ACTIVATE_SECONDS,
  createHoldToActivateController,
} from "./holdToActivate.js";
import {
  buildSharedSettingsSliders,
  buildSharedSettingsRows,
  buildSharedSettingsItems,
  makeSyncVolumeSliders,
  tickSettingsPanel,
} from "./settingsShared.js";

export function createPauseScreen(uiRoot, pauseMenu, handlers) {
  const pauseGroup = makePanel(uiRoot, {
    color: new Color(0, 0, 0, 0.5),
  });

  makeCenterTitle(pauseGroup, -260, strings.pause.title, {
    color: rgb(0.4, 0.7, 1),
  });

  const { music: musicSlider, sfx: sfxSlider } =
    buildSharedSettingsSliders(pauseGroup);
  const menuRows = [
    ...buildSharedSettingsRows(pauseGroup, makeMenuRow),
    makeMenuRow(pauseGroup, 230),
    makeMenuRow(pauseGroup, 275),
  ];
  const syncVolumeSliders = makeSyncVolumeSliders(musicSlider, sfxSlider);
  const sharedItems = buildSharedSettingsItems({
    musicSlider,
    sfxSlider,
    syncVolumeSliders,
  });
  const backToHomeItemIndex = sharedItems.length + 1;

  const holdConfirmLabel = `HOLD ${strings.controls.labels.confirm}`;
  const backToHomeHold = createHoldToActivateController({
    seconds: HOLD_TO_ACTIVATE_SECONDS,
    isHolding: () => {
    const backToHomeRow = menuRows[backToHomeItemIndex];
    const holdingConfirm =
      pauseMenu.focusedIndex === backToHomeItemIndex && actionDown("confirm");
      const holdingPointer =
        !!backToHomeRow?.row && backToHomeRow.row.isMouseOverlapping() && mouseIsDown(0);
      return holdingConfirm || holdingPointer;
    },
    onComplete: () => {
      handlers.backToHome?.();
    },
  });

  pauseMenu.setItems([
    ...sharedItems,
    {
      kind: "action",
      label: () => "BACK TO GAME",
      activate: () => handlers.resume(),
    },
    {
      kind: "action",
      holdToActivateSeconds: HOLD_TO_ACTIVATE_SECONDS,
      label: () =>
        backToHomeHold.getLabel(timeReal, strings.pause.backToHome, holdConfirmLabel),
      activate: () => {},
    },
  ]);

  const footer = makeFooterHints(pauseGroup, [
    { action: "confirm", label: "SELECT" },
    { action: "pause", label: "RESUME" },
  ]);

  return {
    group: pauseGroup,
    tick(gameState) {
      const visible = gameState === GAME_STATES.PAUSE;
      if (!visible) backToHomeHold.clear();
      else backToHomeHold.tick(timeReal);
      tickSettingsPanel(pauseGroup, visible, pauseMenu, menuRows, musicSlider, sfxSlider);
      if (visible) footer.refresh();
    },
  };
}
