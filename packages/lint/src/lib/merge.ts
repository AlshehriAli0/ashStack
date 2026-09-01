import type { OxlintConfig } from "./types.js";

type Key = keyof OxlintConfig;

const append = <K extends Key>(base: OxlintConfig, delta: OxlintConfig, key: K): OxlintConfig[K] => {
  const merged = [...((base[key] ?? []) as unknown[]), ...((delta[key] ?? []) as unknown[])];
  return merged as OxlintConfig[K];
};

const union = <K extends Key>(base: OxlintConfig, delta: OxlintConfig, key: K): OxlintConfig[K] =>
  [...new Set(append(base, delta, key) as unknown[])] as OxlintConfig[K];

const lastWins = <K extends Key>(base: OxlintConfig, delta: OxlintConfig, key: K): OxlintConfig[K] =>
  ({ ...(base[key] as object), ...(delta[key] as object) }) as OxlintConfig[K];

/**
 * Layer `delta` over `base` into one flat config — the way `react` is built
 * from `core` plus a react delta. Plugin lists union, `overrides` append,
 * `rules` and the other keyed blocks are last-wins per key. Entries compose
 * with this rather than oxlint's `extends` so every entry is a single
 * inspectable object and a consumer's own overrides stay trivial.
 */
export const mergeConfigs = (base: OxlintConfig, delta: OxlintConfig): OxlintConfig => ({
  ...base,
  ...delta,
  plugins: union(base, delta, "plugins"),
  jsPlugins: union(base, delta, "jsPlugins"),
  env: lastWins(base, delta, "env"),
  globals: lastWins(base, delta, "globals"),
  categories: lastWins(base, delta, "categories"),
  rules: lastWins(base, delta, "rules"),
  overrides: append(base, delta, "overrides"),
});
