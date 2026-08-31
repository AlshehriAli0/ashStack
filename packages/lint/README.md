# @ashstack/lint

Strict shared oxlint config. Entries are functions: `core()` → `react()` → `react-native()` (each contains the previous, returned flat).

```ts
// oxlint.config.mts  (JSON configs cannot consume npm packages — TS config only)
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [reactNative()],
  rules: { "unistyles/no-margin": "off" }, // your overrides always win
});
```

Run with `oxlint --type-aware --deny-warnings .` (type-aware rules need the `oxlint-tsgolint` peer). Node 22.18+.

**Library rule groups auto-detect from your dependencies** — `zod/`, `query/` (TanStack Query), `zustand/`, `i18n/`, `unistyles/`, `legend-list/`, `legend-state/`, and the Reanimated/Turbo Image/Skia/keyboard `rn/` rules plus their import bans only ship when the library is in your package.json. Modules can be forced: `reactNative({ unistyles: false, i18n: true })`; finer-grained groups are auto-detect only — disable individual rules by name.

Always on: the strict `core` base, react + jsx-a11y + React Compiler + you-might-not-need-an-effect, generic `rn/` rules, and `ash/` convention rules. Off by default (opt in): `ash/no-comments`, `ash/use-design-system`, `ash/components-tsx-only`.

Layout: `src/core`, `src/react`, `src/react-native` each hold their entry (`index.js`) and the rule plugins they introduce (`rules/*.js`).
