import { fileURLToPath } from "node:url";

import type { JsPlugin, RuleMap } from "./types.js";

/** Registered under our own namespace, so every rule this package enables reads the same way. */
export const EFFECT_NAMESPACE = "@ashstack/effects";

/**
 * The vendored copy, not the npm package: depending on it installs 12.3 MB
 * across 60 packages, because it declares `eslint` as a non-optional peer and
 * its code never imports eslint. See `vendor/react-effect/README.md`.
 */
export const EFFECT_SPECIFIER = fileURLToPath(new URL("../../vendor/react-effect/index.mjs", import.meta.url));

export const effectPlugin: JsPlugin = { name: EFFECT_NAMESPACE, specifier: EFFECT_SPECIFIER };

/** The rules that plugin supplies, all nine of them. */
export const EFFECT_RULES: RuleMap = {
  "@ashstack/effects/no-derived-state": "error",
  "@ashstack/effects/no-chain-state-updates": "error",
  "@ashstack/effects/no-event-handler": "error",
  "@ashstack/effects/no-adjust-state-on-prop-change": "error",
  "@ashstack/effects/no-reset-all-state-on-prop-change": "error",
  "@ashstack/effects/no-pass-live-state-to-parent": "error",
  "@ashstack/effects/no-pass-data-to-parent": "error",
  "@ashstack/effects/no-external-store-subscription": "error",
  "@ashstack/effects/no-initialize-state": "error",
};
