// Font assignments. Loaded locally via @font-face in index.html.
export const FONT_HUD = '"Exo 2", system-ui, sans-serif';
export const FONT_MENU = '"Orbitron", "Exo 2", system-ui, sans-serif';
export const FONT_LORE = '"Titillium Web", system-ui, sans-serif';

// Pre-warm so the first frames don't render in the fallback face.
export async function preloadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  await Promise.all([
    document.fonts.load('32px "Exo 2"'),
    document.fonts.load('48px "Orbitron"'),
    document.fonts.load('24px "Titillium Web"'),
  ]).catch(() => {});
}
