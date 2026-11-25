import { fileURLToPath } from "node:url";

import { detect } from "./detect.js";
import type {
  BanGroup,
  ConsumerRestrictedImports,
  ImportAllowance,
  ModuleManifest,
  ModuleMeta,
  OxlintConfig,
  RestrictedImports,
  RestrictedPath,
} from "./types.js";

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
  detect(module.option === undefined ? undefined : options[module.option], module.packages, module.minMajor);

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

/** A path ban with `allowance` taken out of it: fewer names, or nothing left at all. */
const liftPath = (path: RestrictedPath, allowance: ImportAllowance): RestrictedPath[] => {
  const { importNames: lifted } = allowance;
  if (path.name !== allowance.from) return [path];
  if (lifted === undefined) return [];
  if (path.importNames === undefined) return [path];
  const kept = path.importNames.filter(name => !lifted.includes(name));
  return kept.length === 0 ? [] : [{ ...path, importNames: kept }];
};

/**
 * The `no-restricted-imports` setting and overrides for `bans` plus a
 * project's own: the added bans join the shipped ones, and each allowance
 * re-sets the rule for its files with the lifted names taken out. A path ban
 * on a whole module stays when only some names are allowed.
 */
export const restrictedImportsConfig = (
  bans: Required<RestrictedImports>,
  consumer: ConsumerRestrictedImports = {}
): Pick<Required<OxlintConfig>, "rules" | "overrides"> => {
  const merged: Required<RestrictedImports> = { paths: [...bans.paths], patterns: [...bans.patterns] };
  addRestrictedImports(merged, consumer);
  return {
    rules: { "no-restricted-imports": ["error", merged] },
    overrides: (consumer.allow ?? []).map(allowance => ({
      files: allowance.files,
      rules: {
        "no-restricted-imports": [
          "error",
          { paths: merged.paths.flatMap(path => liftPath(path, allowance)), patterns: merged.patterns },
        ],
      },
    })),
  };
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
