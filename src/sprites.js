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
  const xmlUrl = `${sheetPath}.xml`;
  const response = await fetch(xmlUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const subTextures = xml.getElementsByTagName("SubTexture");

  // Get sheet name from path for the key
  const sheetName = sheetPath.split('/').pop();

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute("name");
    const x = parseFloat(st.getAttribute("x"));
    const y = parseFloat(st.getAttribute("y"));
    const w = parseFloat(st.getAttribute("width"));
    const h = parseFloat(st.getAttribute("height"));

    const tile = new TileInfo(vec2(x, y), vec2(w, h), textureInfos[textureIndex]);
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
  }
};
