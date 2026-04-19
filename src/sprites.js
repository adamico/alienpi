import {
  vec2,
  TileInfo,
  textureInfos,
} from "../node_modules/littlejsengine/dist/littlejs.esm.js";

const spritesMap = new Map();

/**
 * Loads a spritesheet XML and populates the composite sprite map
 * @param {string} sheetPath Path to the XML (without extension)
 * @param {number} textureIndex Index in textureInfos
 */
export async function loadSprites(sheetPath, textureIndex) {
  // Enable linear filtering for smoother large sprites/rotation
  const info = textureInfos[textureIndex];
  if (info && info.image) {
    info.image.style.imageRendering = "auto";
  }

  const xmlUrl = `${sheetPath}.xml`;
  const response = await fetch(xmlUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const subTextures = xml.getElementsByTagName("SubTexture");

  // Get sheet name from path for the key
  const sheetName = sheetPath.split("/").pop();

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute("name");
    const x = parseFloat(st.getAttribute("x"));
    const y = parseFloat(st.getAttribute("y"));
    const w = parseFloat(st.getAttribute("width"));
    const h = parseFloat(st.getAttribute("height"));

    // Add a tiny 2px shrink to prevent bleeding from adjacent sprites
    const bleedShrink = 2;
    const tile = new TileInfo(
      vec2(x + bleedShrink, y + bleedShrink),
      vec2(w - bleedShrink * 2, h - bleedShrink * 2),
      textureInfos[textureIndex],
    );
    spritesMap.set(`${sheetName}:${name}`, tile);
  }
}

/**
 * Accessor for sprites with sheet-aware composite keys
 */
export const sprites = {
  get: (name, sheet) => {
    const key = `${sheet}:${name}`;
    const sprite = spritesMap.get(key);
    if (!sprite) {
      console.warn(`Sprite not found: ${key}`);
    }
    return sprite;
  },

  /**
   * Returns a vec2 size that respects the sprite's aspect ratio
   * @param {string} name
   * @param {string} sheet
   * @param {number|Vector2} baseSize Width or size vector to use as base
   * @returns {Vector2} Corrected size
   */
  getSize: (name, sheet, baseSize) => {
    const sprite = sprites.get(name, sheet);
    if (!sprite) return vec2(1);

    const width = typeof baseSize === "number" ? baseSize : baseSize.x;
    const aspect = sprite.size.y / sprite.size.x;
    return vec2(width, width * aspect);
  },
};
