# @ashstack/lint

Strict shared oxlint config. Entries: `core` → `react` → `react-native` (each extends the previous, exported flat).

```ts
// oxlint.config.mts  (JSON configs cannot consume npm packages — TS config only)
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [reactNative],
  rules: { "unistyles/no-margin": "off" }, // your overrides always win
});
```

Run with `oxlint --type-aware --deny-warnings .` (type-aware rules need the `oxlint-tsgolint` peer).

Custom rule domains (all error in `react-native` unless noted): `shared/` (TanStack Query, i18n, zod, naming, comment discipline — enabled progressively from `core`), `rn/` (Reanimated, worklets, Turbo Image, keyboard, Skia), `unistyles/`, `legend-list/`, `state/` (Legend State). `shared/no-comments`, `shared/use-design-system`, `shared/components-tsx-only` ship disabled — opt in per project.

Peers: `oxlint >= 1.79`, optional `oxlint-tsgolint`. Node 22.18+.
