export const GAME_STATES = {
  CREDITS: "CREDITS",
  HOME: "HOME",
  LORE: "LORE",
  PAUSE: "PAUSE",
  PLAYING: "PLAYING",
  POST_RUN: "POST_RUN",
  SETTINGS: "SETTINGS",
  TEST_LAB: "TEST_LAB",
  TITLE: "TITLE",
  TUTORIAL: "TUTORIAL",
};

const ASSET_PATH = "public/assets/";

export const SPRITE_SHEET_NAME = "spaceShooter2_spritesheet";
export const SPRITE_SHEET2_NAME = "sheet";

export const SPRITE_SHEET_PATHS = [
  `${ASSET_PATH}${SPRITE_SHEET_NAME}`,
  `${ASSET_PATH}${SPRITE_SHEET2_NAME}`,
];

export const starfield = {
  alphaPower: 8,
  count: 2000,
  horizontalOffset: 9,
  sizeBase: 0.07,
  sizeRange: 0.11,
  speedBase: 5,
  speedRange: 7,
  verticalOffset: 35,
  verticalRange: 70,
};
