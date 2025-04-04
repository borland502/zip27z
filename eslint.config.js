import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import { google } from "eslint-config-google";


export default defineConfig({
  overrides: [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { files: ["**/*.{js,mjs,cjs,ts}"], languageOptions: { globals: globals.browser } },
    { files: ["**/*.{js,mjs,cjs,ts}"], plugins: { js }, extends: ["js/recommended"] }
  ],
  ...google,
});