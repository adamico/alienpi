import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    // game.js sprays LittleJS exports onto globalThis at runtime; skip no-undef.
    files: ["game.js"],
    rules: { "no-undef": "off" },
  },
]);
