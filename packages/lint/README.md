# @ashstack/lint

Strict shared oxlint config. Entries are functions: `core()` → `react()` → `react-native()` (each contains the previous, returned flat).

```ts
// oxlint.config.mts  (JSON configs cannot consume npm packages — TS config only)
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [reactNative()],
  rules: { "@ashstack/unistyles/no-margin": "off" }, // your overrides always win
});
```

Run with `oxlint --type-aware --deny-warnings .` (type-aware rules need the `oxlint-tsgolint` peer). Node 22.18+.

**Library rule groups auto-detect from your dependencies** — `@ashstack/zod/`, `@ashstack/query/`, `@ashstack/zustand/`, `@ashstack/i18n/`, `@ashstack/unistyles/`, `@ashstack/legend-list/`, `@ashstack/legend-state/`, `@ashstack/reanimated/`, `@ashstack/turbo-image/`, `@ashstack/skia/`, `@ashstack/keyboard/` plus their import bans only ship when the library is in your package.json. Each module is one boolean: `reactNative({ unistyles: false, i18n: true })`. Import bans are auto-detect only; disable individual rules by name.

Always on: the strict `core` base, react + jsx-a11y + React Compiler + you-might-not-need-an-effect, generic `@ashstack/react-native/` rules, and `@ashstack/core/` convention rules. Off by default (opt in): `@ashstack/core/no-comments`, `@ashstack/core/use-design-system`, `@ashstack/core/components-tsx-only`.

Layout: `src/core`, `src/react`, `src/react-native` each hold their entry (`index.js`) and the rule plugins they introduce (`rules/*.js`).
