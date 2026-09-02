import { fileURLToPath } from "node:url";

import type { JsPlugin, RuleMap } from "./types.js";

const EFFECT_PLUGIN = "eslint-plugin-react-you-might-not-need-an-effect";

const EFFECT_RULES: RuleMap = {
  "react-effect/no-derived-state": "error",
  "react-effect/no-chain-state-updates": "error",
  "react-effect/no-event-handler": "error",
  "react-effect/no-adjust-state-on-prop-change": "error",
  "react-effect/no-reset-all-state-on-prop-change": "error",
  "react-effect/no-pass-live-state-to-parent": "error",
  "react-effect/no-pass-data-to-parent": "error",
  "react-effect/no-external-store-subscription": "error",
  "react-effect/no-initialize-state": "error",
};

/**
 * The effect plugin, when the consumer has it. It is an optional peer because
 * it unpacks to 218 KB of React lint rules, which a backend or CLI project
 * taking `core()` should not have to install. Absent, `react()` leaves out the
 * plugin and the nine rules that need it rather than failing to load.
 */
export const effectPlugin = (): { present: boolean; jsPlugins: JsPlugin[]; rules: RuleMap } => {
  try {
    const specifier = fileURLToPath(import.meta.resolve(EFFECT_PLUGIN));
    return { present: true, jsPlugins: [{ name: "react-effect", specifier }], rules: EFFECT_RULES };
  } catch {
    return { present: false, jsPlugins: [], rules: {} };
  }
};
