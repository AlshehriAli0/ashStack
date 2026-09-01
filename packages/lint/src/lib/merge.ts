import type { OxlintConfig } from "./types.js";

const append = (base: unknown, delta: unknown): unknown[] => [
  ...((base as unknown[] | undefined) ?? []),
  ...((delta as unknown[] | undefined) ?? []),
];

const union = (base: unknown, delta: unknown): unknown[] => [...new Set(append(base, delta))];

const lastWins = (base: unknown, delta: unknown): object => ({ ...(base as object), ...(delta as object) });

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
  plugins: union(base.plugins, delta.plugins),
  jsPlugins: union(base.jsPlugins, delta.jsPlugins),
  env: lastWins(base.env, delta.env),
  globals: lastWins(base.globals, delta.globals),
  categories: lastWins(base.categories, delta.categories),
  rules: lastWins(base.rules, delta.rules),
  overrides: append(base.overrides, delta.overrides),
});
