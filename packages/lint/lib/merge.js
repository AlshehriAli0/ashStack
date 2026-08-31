// Deterministic layering for config entries (react = merge(core, reactDelta), etc.).
// We compose ourselves instead of relying on oxlint's `extends` so every entry is
// one flat, inspectable object and consumer overrides stay trivial.
const uniq = arr => [...new Set(arr)];

export const mergeConfigs = (base, delta) => ({
  ...base,
  ...delta,
  plugins: uniq([...(base.plugins ?? []), ...(delta.plugins ?? [])]),
  jsPlugins: uniq([...(base.jsPlugins ?? []), ...(delta.jsPlugins ?? [])]),
  env: { ...base.env, ...delta.env },
  globals: { ...base.globals, ...delta.globals },
  categories: { ...base.categories, ...delta.categories },
  rules: { ...base.rules, ...delta.rules },
  overrides: [...(base.overrides ?? []), ...(delta.overrides ?? [])],
});
