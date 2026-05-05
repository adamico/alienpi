import { Color, rgb, timeReal } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { makeMenuRow } from "./menuView.js";
import { makePanel } from "./panel.js";
import { makeCenterTitle } from "./uiText.js";
import { makeFooterHints } from "./footerHints.js";
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

  let backToHomeArmedUntil = 0;
  pauseMenu.setItems([
    ...buildSharedSettingsItems({ musicSlider, sfxSlider, syncVolumeSliders }),
    {
      kind: "action",
      label: () => "BACK TO GAME",
      activate: () => handlers.resume(),
    },
    {
      kind: "action",
      label: () =>
        timeReal < backToHomeArmedUntil
          ? strings.pause.backToHomeArmed
          : strings.pause.backToHome,
      activate: () => {
        if (timeReal < backToHomeArmedUntil) {
          backToHomeArmedUntil = 0;
          handlers.backToHome?.();
        } else {
          backToHomeArmedUntil = timeReal + 3;
        }
      },
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
      tickSettingsPanel(
        pauseGroup,
        visible,
        pauseMenu,
        menuRows,
        musicSlider,
        sfxSlider,
      );
      if (visible) footer.refresh();
    },
  };
}
