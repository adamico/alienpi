import { rgb, Color, timeReal, mouseIsDown } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { actionDown } from "../input/bindings.js";
import { resetTutorialProgress } from "../game/tutorialProgress.js";
import { makeMenuRow } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
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

export function createSettingsScreen(uiRoot, settingsMenu, handlers) {
  const settingsGroup = makePanel(uiRoot, {
    color: new Color(0.05, 0.05, 0.1, 0.9),
  });

  makeCenterTitle(settingsGroup, -260, strings.settings.settingsTitle, {
    color: rgb(1, 0.8, 0.2),
  });

  const { music: musicSlider, sfx: sfxSlider } =
    buildSharedSettingsSliders(settingsGroup);
  const menuRows = buildSharedSettingsRows(settingsGroup, makeMenuRow);
  menuRows.push(makeMenuRow(settingsGroup, 220));
  menuRows.push(makeMenuRow(settingsGroup, 260));
  const syncVolumeSliders = makeSyncVolumeSliders(musicSlider, sfxSlider);
  const sharedItems = buildSharedSettingsItems({
    musicSlider,
    sfxSlider,
    syncVolumeSliders,
  });
  const resetItemIndex = sharedItems.length + 1;

  const holdConfirmLabel = `HOLD ${strings.controls.labels.confirm}`;
  const resetHold = createHoldToActivateController({
    seconds: HOLD_TO_ACTIVATE_SECONDS,
    isHolding: () => {
    const resetRow = menuRows[resetItemIndex];
    const holdingConfirm =
      settingsMenu.focusedIndex === resetItemIndex && actionDown("confirm");
      const holdingPointer =
        !!resetRow?.row && resetRow.row.isMouseOverlapping() && mouseIsDown(0);
      return holdingConfirm || holdingPointer;
    },
    onComplete: () => {
      resetTutorialProgress();
    },
  });

  settingsMenu.setItems([
    ...sharedItems,
    {
      kind: "action",
      label: () => `${strings.settings.controlsLabel} →`,
      activate: () => handlers.openControls?.(),
    },
    {
      kind: "action",
      holdToActivateSeconds: HOLD_TO_ACTIVATE_SECONDS,
      label: () =>
        resetHold.getLabel(timeReal, strings.settings.resetProgress, holdConfirmLabel),
      activate: () => {},
    },
    {
      kind: "action",
      label: () => "BACK",
      activate: () => handlers.back(),
    },
  ]);

  return {
    group: settingsGroup,
    tick(gameState) {
      const visible = gameState === GAME_STATES.SETTINGS;
      if (!visible) resetHold.clear();
      else resetHold.tick(timeReal);
      tickSettingsPanel(settingsGroup, visible, settingsMenu, menuRows, musicSlider, sfxSlider);
    },
  };
}
