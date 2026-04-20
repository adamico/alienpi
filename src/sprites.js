import {
  vec2,
  TileInfo,
  TextureInfo,
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

/**
 * Dynamically packs multiple individual images into a single sprite sheet TextureInfo
 * and populates the sprite map.
 * @param {string[]} imageUrls List of URLs to individual images
 * @param {string} sheetName Name to group these sprites under
 * @returns {number} The texture index assigned to the new sprite sheet
 */
export async function loadDynamicSpritesheet(imageUrls, sheetName) {
  const textureIndex = textureInfos.length;
  // Initialize an empty space in the engine's texture collection
  textureInfos.push(null);

  const images = await Promise.all(
    imageUrls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ url, img });
        img.src = url;
      });
    }),
  );

  // Simple packer: place images in a row or wrap around
  const padding = 2; // For bleed prevention
  let maxWidth = 0;

  // Let's just create a square-ish sheet, say 1024 max width
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const positions = [];

  for (const { img } of images) {
    if (curX + img.width + padding * 2 > 1024) {
      curX = 0;
      curY += rowHeight;
      rowHeight = 0;
    }
    positions.push({ x: curX + padding, y: curY + padding });
    curX += img.width + padding * 2;
    rowHeight = Math.max(rowHeight, img.height + padding * 2);
    maxWidth = Math.max(maxWidth, curX);
  }

  const maxHeight = curY + rowHeight;

  // Create canvas for the combined spritesheet
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, maxWidth);
  canvas.height = Math.max(1, maxHeight);
  const ctx = canvas.getContext("2d");

  // Draw images
  for (let i = 0; i < images.length; i++) {
    const { img } = images[i];
    const pos = positions[i];
    ctx.drawImage(img, pos.x, pos.y);
  }

  // Configure TextureInfo now that the canvas is fully drawn
  const tInfo = new TextureInfo(canvas);
  textureInfos[textureIndex] = tInfo;
  canvas.style = { imageRendering: "auto" };

  // Configure TileInfos
  for (let i = 0; i < images.length; i++) {
    const { url, img } = images[i];
    const pos = positions[i];
    const name = url.split("/").pop();
    const tile = new TileInfo(
      vec2(pos.x, pos.y),
      vec2(img.width, img.height),
      textureInfos[textureIndex],
    );
    spritesMap.set(`${sheetName}:${name}`, tile);
  }

  return textureIndex;
}
