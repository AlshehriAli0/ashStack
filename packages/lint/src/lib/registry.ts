import { coreModules } from "../core/index.js";
import { reactNativeModules } from "../react-native/index.js";
import { reactModules } from "../react/index.js";
import { shortName } from "./module.js";
import type { ModuleManifest } from "./types.js";

/** Every module the package ships — the list the fixture gate and the docs generator walk. */
export const allModules: ModuleManifest[] = [...coreModules, ...reactModules, ...reactNativeModules];
export { shortName };
