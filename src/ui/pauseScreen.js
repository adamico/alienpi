import { Color, rgb } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { makeMenuRow } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
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
  const menuRows = buildSharedSettingsRows(pauseGroup, makeMenuRow);
  const syncVolumeSliders = makeSyncVolumeSliders(musicSlider, sfxSlider);

  pauseMenu.setItems([
    ...buildSharedSettingsItems({ musicSlider, sfxSlider, syncVolumeSliders }),
    {
      kind: "action",
      label: () => "BACK TO GAME (ESC)",
      activate: () => handlers.resume(),
    },
  ]);

  return {
    group: pauseGroup,
    tick(gameState) {
      tickSettingsPanel(
        pauseGroup,
        gameState === GAME_STATES.PAUSE,
        pauseMenu,
        menuRows,
        musicSlider,
        sfxSlider,
      );
    },
  };
}
