import { fileURLToPath } from "node:url";

import type { JsPlugin, RuleMap } from "./types.js";

/** Official StyleX rules, bundled locally to avoid installing their runtime dependencies in every consumer. */
export const STYLEX_SPECIFIER = fileURLToPath(new URL("../../vendor/stylex/index.mjs", import.meta.url));

export const stylexPlugin: JsPlugin = {
  name: "@stylexjs",
  specifier: STYLEX_SPECIFIER,
};

export const STYLEX_RULES: RuleMap = {
  "@stylexjs/valid-styles": "error",
  "@stylexjs/valid-shorthands": "error",
  "@stylexjs/no-unused": "error",
  "@stylexjs/enforce-extension": "error",
  "@stylexjs/no-legacy-contextual-styles": "error",
  "@stylexjs/no-nonstandard-styles": "error",
};
