import { rgb, Color, timeReal } from "../engine.js";
import { GAME_STATES, strings } from "../config/index.js";
import { resetEconomy } from "../game/economy.js";
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
  const syncVolumeSliders = makeSyncVolumeSliders(musicSlider, sfxSlider);

  let resetArmedUntil = 0;
  settingsMenu.setItems([
    ...buildSharedSettingsItems({ musicSlider, sfxSlider, syncVolumeSliders }),
    {
      kind: "action",
      label: () =>
        timeReal < resetArmedUntil
          ? "PRESS AGAIN TO CONFIRM"
          : "RESET PROGRESS",
      activate: () => {
        if (timeReal < resetArmedUntil) {
          resetEconomy();
          resetArmedUntil = 0;
        } else {
          resetArmedUntil = timeReal + 3;
        }
      },
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
      tickSettingsPanel(
        settingsGroup,
        gameState === GAME_STATES.SETTINGS,
        settingsMenu,
        menuRows,
        musicSlider,
        sfxSlider,
      );
    },
  };
}
