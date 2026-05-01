// English (en) localization - organized by view category, flattened for backward compatibility
import { title } from "./title.js";
import { story } from "./story.js";
import { hud } from "./hud.js";
import { pause } from "./pause.js";
import { settings as settingsStrings } from "./settingsMenu.js";
import { home } from "./home.js";
import { postRun } from "./postRun.js";
import { links } from "./links.js";

// Flatten categories into ui namespace for backward compatibility
export const en = {
  ui: {
    ...title,
    ...story,
    ...hud,
    ...pause,
    ...settingsStrings,
    ...home,
    ...postRun,
    links,
  },
};
