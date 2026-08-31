import { fileURLToPath } from "node:url";

import { detect } from "./detect.js";
import type { BanGroup, ModuleManifest, RestrictedImports, Rule } from "./types.js";

/**
 * Identity helper: types the manifest and keeps the shape honest. The returned
 * object is handed to oxlint as the plugin (it ignores the manifest extras).
 */
export const defineModule = (manifest: ModuleManifest): ModuleManifest => manifest;

const shortName = (module: ModuleManifest): string => module.meta.name.slice("@ashstack/".length);

export interface Composed {
  jsPlugins: string[];
  rules: Record<string, string>;
  restricted: Required<RestrictedImports>;
}

/**
 * Turn manifests + options into the config fragments an entry spreads in:
 * which plugin files to load, which rules to enable (skipping defaultOff and
 * package-gated rules whose package is absent), and the merged import bans.
 */
export const composeModules = (
  modules: ModuleManifest[],
  options: Record<string, boolean | undefined>,
  banGroups: BanGroup[] = []
): Composed => {
  const composed: Composed = { jsPlugins: [], rules: {}, restricted: { paths: [], patterns: [] } };

  for (const module of modules) {
    const enabled = detect(module.option === undefined ? undefined : options[module.option], module.packages);
    if (!enabled) continue;

    composed.jsPlugins.push(fileURLToPath(module.url));
    for (const [name, rule] of Object.entries<Rule>(module.rules)) {
      if (rule.meta.defaultOff) continue;
      if (rule.meta.packages && !detect(undefined, rule.meta.packages)) continue;
      composed.rules[`${module.meta.name}/${name}`] = "error";
    }
    composed.restricted.paths.push(...(module.restrictedImports?.paths ?? []));
    composed.restricted.patterns.push(...(module.restrictedImports?.patterns ?? []));
  }

  for (const group of banGroups) {
    if (!detect(undefined, group.packages)) continue;
    composed.restricted.paths.push(...(group.restrictedImports.paths ?? []));
    composed.restricted.patterns.push(...(group.restrictedImports.patterns ?? []));
  }

  return composed;
};

export { shortName };
