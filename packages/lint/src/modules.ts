import coreModule from "./core/rules/core/index.js";
import zodModule from "./core/rules/zod/index.js";
import keyboardModule from "./react-native/rules/keyboard/index.js";
import legendListModule from "./react-native/rules/legend-list/index.js";
import legendStateModule from "./react-native/rules/legend-state/index.js";
import reactNativeModule from "./react-native/rules/react-native/index.js";
import reanimatedModule from "./react-native/rules/reanimated/index.js";
import skiaModule from "./react-native/rules/skia/index.js";
import turboImageModule from "./react-native/rules/turbo-image/index.js";
import unistylesModule from "./react-native/rules/unistyles/index.js";
import i18nModule from "./react/rules/i18n/index.js";
import queryModule from "./react/rules/query/index.js";
import reactWebModule from "./react/rules/react/index.js";
import tailwindModule from "./react/rules/tailwind/index.js";
import tanstackRouterModule from "./react/rules/tanstack-router/index.js";
import zustandModule from "./react/rules/zustand/index.js";

/**
 * Every module with its rules, for the docs generator, the fixture check and
 * the registry generator.
 *
 * An entry never imports this. A config needs each module's metadata and the
 * path to its plugin file, which is what `lib/registry.ts` carries; oxlint
 * loads the rule code itself from that path. Importing rules here as well
 * would put all 74 implementations in every consumer's config graph.
 */
export const coreModules = [coreModule, zodModule];

export const reactModules = [
  reactWebModule,
  queryModule,
  zustandModule,
  i18nModule,
  tailwindModule,
  tanstackRouterModule,
];

export const reactNativeModules = [
  reactNativeModule,
  unistylesModule,
  legendListModule,
  legendStateModule,
  reanimatedModule,
  turboImageModule,
  skiaModule,
  keyboardModule,
];
