import type { OxlintConfig } from "./types.js";

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
  plugins: [...new Set([...(base.plugins ?? []), ...(delta.plugins ?? [])])],
  jsPlugins: [...new Set([...(base.jsPlugins ?? []), ...(delta.jsPlugins ?? [])])],
  env: { ...base.env, ...delta.env },
  globals: { ...base.globals, ...delta.globals },
  categories: { ...base.categories, ...delta.categories },
  rules: { ...base.rules, ...delta.rules },
  overrides: [...(base.overrides ?? []), ...(delta.overrides ?? [])],
});
