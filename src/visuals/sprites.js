import { vec2, TileInfo, TextureInfo, textureInfos } from "../engine.js";

const spritesMap = new Map();

/**
 * Loads a spritesheet XML and populates the composite sprite map
 * @param {string} sheetPath Path to the XML (without extension)
 * @param {number} textureIndex Index in textureInfos
 * @returns {Promise<void>}
 */
export async function loadSprites(sheetPath, textureIndex) {
  // Validate that XML sheet path and texture slot still point to the same PNG.
  // LittleJS resolves image load errors silently, so surface mismatch explicitly.
  const info = textureInfos[textureIndex];
  const sheetName = sheetPath.split("/").pop();
  const expectedFile = `${sheetName}.png`;
  const srcRaw = info?.image?.currentSrc || info?.image?.src || "";
  let decodedSrc = srcRaw;
  try {
    decodedSrc = decodeURIComponent(srcRaw);
  } catch {
    // Keep raw source if decoding fails.
  }
  if (!info || !info.image || !decodedSrc.includes(expectedFile)) {
    console.error(
      `[sprites] texture mapping mismatch: sheet="${sheetName}" textureIndex=${textureIndex} expected="${expectedFile}" actual="${decodedSrc || "<missing>"}"`,
    );
  }

  // Enable linear filtering for smoother large sprites/rotation
  if (info && info.image) {
    info.image.style.imageRendering = "auto";
  }

  const xmlUrl = `${sheetPath}.xml`.replace(/&/g, "%26");
  const response = await fetch(xmlUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const subTextures = xml.getElementsByTagName("SubTexture");

  for (let i = 0; i < subTextures.length; i++) {
    const st = subTextures[i];
    const name = st.getAttribute("name");
    let x = parseFloat(st.getAttribute("x"));
    let y = parseFloat(st.getAttribute("y"));
    const w = parseFloat(st.getAttribute("width"));
    const h = parseFloat(st.getAttribute("height"));

    // Apply coordinate transformation for double sheets to fix Kenney XML mismatch
    if (sheetName.endsWith("_double")) {
      const sheetHeight = textureInfos[textureIndex].image.height;
      y = sheetHeight - h - y; // Flip vertically
    }

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
    const key = sheet ? `${sheet}:${name}` : name;
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

  /**
   * Returns all registered sprite names for a given sheet
   * @param {string} sheet
   * @returns {string[]}
   */
  getNames: (sheet) => {
    const names = [];
    const prefix = `${sheet}:`;
    for (const key of spritesMap.keys()) {
      if (key.startsWith(prefix)) {
        names.push(key.substring(prefix.length));
      }
    }
    return names;
  },
};

/**
 * Dynamically packs multiple individual images into a single sprite sheet TextureInfo
 * and populates the sprite map.
 * @param {string[]} imageUrls List of URLs to individual images
 * @param {string} sheetName Name to group these sprites under
 * @returns {Promise<number>} The texture index assigned to the new sprite sheet
 */
export async function loadDynamicSpritesheet(imageUrls, sheetName) {
  const images = await Promise.all(
    imageUrls.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ url, img });
        img.onerror = () => {
          console.warn(`Failed to load sprite: ${url}`);
          resolve({ url, img: null });
        };
        img.src = url;
      });
    }),
  );

  // Simple packer: place images in a row or wrap around
  const padding = 2; // For bleed prevention
  const maxSheetWidth = 2048; // Increased from 1024 to handle more/larger images
  let maxWidth = 0;
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const positions = [];

  for (const { img } of images) {
    if (!img) {
      positions.push(null);
      continue;
    }
    if (curX + img.width + padding * 2 > maxSheetWidth) {
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
    if (!images[i].img) continue;
    const { img } = images[i];
    const pos = positions[i];
    ctx.drawImage(img, pos.x, pos.y);
  }

  // Create TextureInfo - this automatically adds to textureInfos array
  const tInfo = new TextureInfo(canvas);
  canvas.style.imageRendering = "auto";

  // Configure TileInfos
  for (let i = 0; i < images.length; i++) {
    if (!images[i].img) continue;
    const { url, img } = images[i];
    const pos = positions[i];
    const name = url.split("/").pop();

    // Use a small bleed shrink for consistency with loadSprites
    const bleedShrink = 1;
    const tile = new TileInfo(
      vec2(pos.x + bleedShrink, pos.y + bleedShrink),
      vec2(img.width - bleedShrink * 2, img.height - bleedShrink * 2),
      tInfo,
    );
    const key = sheetName ? `${sheetName}:${name}` : name;
    spritesMap.set(key, tile);
  }

  return textureInfos.indexOf(tInfo);
}
