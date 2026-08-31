// Deterministic layering for config entries (react = merge(core, reactDelta), etc.).
// We compose ourselves instead of relying on oxlint's `extends` so every entry is
// one flat, inspectable object and consumer overrides stay trivial.
// Invariants: `rules` last-wins per rule, plugin arrays union, `overrides` append.
import type { OxlintConfig } from "./types.js";

const uniq = <T>(arr: T[]): T[] => [...new Set(arr)];

export const mergeConfigs = (base: OxlintConfig, delta: OxlintConfig): OxlintConfig => ({
  ...base,
  ...delta,
  plugins: uniq([...((base.plugins as unknown[]) ?? []), ...((delta.plugins as unknown[]) ?? [])]),
  jsPlugins: uniq([...((base.jsPlugins as unknown[]) ?? []), ...((delta.jsPlugins as unknown[]) ?? [])]),
  env: { ...(base.env as object), ...(delta.env as object) },
  globals: { ...(base.globals as object), ...(delta.globals as object) },
  categories: { ...(base.categories as object), ...(delta.categories as object) },
  rules: { ...(base.rules as object), ...(delta.rules as object) },
  overrides: [...((base.overrides as unknown[]) ?? []), ...((delta.overrides as unknown[]) ?? [])],
});
