import { fileURLToPath } from "node:url";

import { detect } from "./detect.js";
import type { BanGroup, ModuleManifest, ModuleMeta, RestrictedImports } from "./types.js";

/**
 * Identity helper: types the manifest and keeps the shape honest. The returned
 * object is handed to oxlint as the plugin (it ignores the manifest extras).
 */
export const defineModule = (manifest: ModuleManifest): ModuleManifest => manifest;

const shortName = (module: { meta: { name: string } }): string => module.meta.name.slice("@ashstack/".length);

export interface Composed {
  jsPlugins: string[];
  /**
   * Every enabled module rule at a bare `"error"`. These are defaults, so an
   * entry that wants one at a different severity or with options has to spread
   * its own setting after this block, not before it.
   */
  rules: Record<string, "error">;
  restricted: Required<RestrictedImports>;
}

const isModuleEnabled = (module: ModuleMeta, options: Record<string, boolean | undefined>): boolean =>
  detect(module.option === undefined ? undefined : options[module.option], module.packages);

const enabledRuleIds = (module: ModuleMeta): string[] => {
  const ids: string[] = [];
  for (const [name, rule] of Object.entries(module.rules)) {
    if (rule.defaultOff) continue;
    if (rule.packages && !detect(undefined, rule.packages)) continue;
    ids.push(`${module.meta.name}/${name}`);
  }
  return ids;
};

const addRestrictedImports = (into: Required<RestrictedImports>, from: RestrictedImports | undefined): void => {
  into.paths.push(...(from?.paths ?? []));
  into.patterns.push(...(from?.patterns ?? []));
};

/**
 * Turn manifests + options into the config fragments an entry spreads in:
 * which plugin files to load, which rules to enable, and the merged import
 * bans from the enabled modules plus the enabled ban-only groups.
 */
export const composeModules = (
  modules: ModuleMeta[],
  options: Record<string, boolean | undefined>,
  banGroups: BanGroup[] = []
): Composed => {
  const composed: Composed = { jsPlugins: [], rules: {}, restricted: { paths: [], patterns: [] } };

  for (const module of modules) {
    if (!isModuleEnabled(module, options)) continue;

    const ids = enabledRuleIds(module);
    if (ids.length > 0) composed.jsPlugins.push(fileURLToPath(module.url));
    for (const id of ids) composed.rules[id] = "error";
    addRestrictedImports(composed.restricted, module.restrictedImports);
  }

  for (const group of banGroups) {
    if (!detect(undefined, group.packages)) continue;
    addRestrictedImports(composed.restricted, group.restrictedImports);
  }

  return composed;
};

export { shortName };
