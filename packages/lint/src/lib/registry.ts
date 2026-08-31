// Every module the package ships, for the scripts (fixture gate, docs generator).
import { coreModules } from "../core/index.js";
import { reactNativeModules } from "../react-native/index.js";
import { reactModules } from "../react/index.js";
import { shortName } from "./module.js";
import type { ModuleManifest } from "./types.js";

export const allModules: ModuleManifest[] = [...coreModules, ...reactModules, ...reactNativeModules];
export { shortName };
