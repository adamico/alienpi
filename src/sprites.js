import {
  vec2,
  TileInfo,
  textureInfos,
} from "../node_modules/littlejsengine/dist/littlejs.esm.js";
import { SPRITE_SHEET_PATH } from "./config.js";

export const sprites = new Map();

export async function loadSprites() {
  const xmlUrl = `${SPRITE_SHEET_PATH}.xml`;
  const response = await fetch(xmlUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const subTextures = xml.getElementsByTagName("SubTexture");

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute("name");
    const x = parseFloat(st.getAttribute("x"));
    const y = parseFloat(st.getAttribute("y"));
    const w = parseFloat(st.getAttribute("width"));
    const h = parseFloat(st.getAttribute("height"));

    // LittleJS expects Top-Left Y-down for TileInfo pos
    sprites.set(name, new TileInfo(vec2(x, y), vec2(w, h), textureInfos[0]));
  }
}
