/**
 * Internal aggregate for this repo's own scripts and tests, which import it
 * from `dist/` by path. Not in `exports`: a consumer imports the entry it
 * uses, so `core()` does not load every rule file in the package.
 */
export { default as core, coreModules } from "./core/index.js";
export { default as react, reactModules } from "./react/index.js";
export { default as reactNative, reactNativeModules, banGroups } from "./react-native/index.js";
export type { CoreOptions, ReactOptions, ReactNativeOptions, ModuleManifest } from "./lib/types.js";
