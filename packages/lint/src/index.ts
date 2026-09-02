/**
 * Internal aggregate for this repo's own scripts and tests, which import it
 * from `dist/` by path. Not in `exports`: a consumer imports the entry it
 * uses, so `core()` does not load every rule file in the package.
 */
export { default as core } from "./core/index.js";
export { default as react } from "./react/index.js";
export { default as reactNative, banGroups } from "./react-native/index.js";
export { coreModules, reactModules, reactNativeModules } from "./modules.js";
export type { CoreOptions, ReactOptions, ReactNativeOptions, ModuleManifest } from "./lib/types.js";
