# ashStack

Shared, strict oxc tooling: [`@ashstack/lint`](packages/lint) (oxlint configs + ~60 custom rules) and [`@ashstack/fmt`](packages/fmt) (oxfmt config). One install per new project instead of hand-copying lint setups around.

## Quick start

```sh
bun add -d oxlint oxfmt oxlint-tsgolint @ashstack/lint @ashstack/fmt
```

```ts
// oxlint.config.mts
import { reactNative } from "@ashstack/lint"; // or: core, react
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [reactNative()] });
```

```ts
// oxfmt.config.mts
import fmt from "@ashstack/fmt";
export default fmt;
```

```sh
oxlint --type-aware --deny-warnings .
oxfmt --check .
```

> TS config files (`oxlint.config.mts`) are the **only** supported consumption path — oxlint's JSON `extends` cannot resolve npm packages, and oxfmt has no `extends` at all. Requires Node 22.18+.

## Entries

| Entry            | For                    | Always adds                                                                  |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `core()`         | any TypeScript project | strict eslint/typescript/unicorn/promise base + `ash/` convention rules      |
| `react()`        | React (web)            | react + jsx-a11y + React Compiler + you-might-not-need-an-effect             |
| `react-native()` | Expo / RN              | generic `rn/` rules (leaked renders, view nesting, keyboard events, images…) |

Each entry is a function returning a flat, plain config object — `react()` already contains all of `core()`.

## Library rule groups (auto-detected)

Library-specific rules ship only when you actually depend on that library — detected from your package.json (walking up, so monorepos work). Rule **modules** (`zod`, `query`, `zustand`, `i18n`, `unistyles`, `legendList`, `legendState`) can also be forced with a boolean: `reactNative({ unistyles: false, i18n: true })`. Everything finer-grained (Reanimated/Turbo Image/Skia/keyboard rule subsets, the import bans) is auto-detect only — to disagree with one rule, turn that rule off by name.

| Group / rule prefix                                | Enabled when you depend on                                   |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `zod/`                                             | `zod`                                                        |
| `query/`                                           | `@tanstack/react-query`                                      |
| `zustand/`                                         | `zustand`                                                    |
| `i18n/`                                            | i18next / lingui / react-intl / use-intl / expo-localization |
| `unistyles/` + bans                                | `react-native-unistyles`                                     |
| `legend-list/` + bans                              | `@legendapp/list`                                            |
| `legend-state/` + ban                              | `@legendapp/state`                                           |
| Reanimated `rn/` rules + bans                      | `react-native-reanimated`                                    |
| Turbo Image `rn/` rules                            | `react-native-turbo-image`                                   |
| `rn/skia-performance`                              | `@shopify/react-native-skia`                                 |
| keyboard / Pressable / router / font / crypto bans | the matching library                                         |

## Overriding

Your `rules` block always wins:

```ts
export default defineConfig({
  extends: [reactNative()],
  rules: {
    complexity: ["error", { max: 20 }],
    "unistyles/no-margin": "off",
  },
});
```

Rules people turn off first: `max-lines` / `max-lines-per-function` / `complexity` (size caps), `no-await-in-loop`, `typescript/no-unnecessary-condition` (noisy with imprecise types), `ash/no-naming-convention`, `unicorn/filename-case`, `typescript/no-floating-promises` (only if you can't run `--type-aware`).

Shipped but **off by default** (opt in): `ash/no-comments`, `ash/use-design-system`, `ash/components-tsx-only`.

## Development

```sh
bun install
bun run check:fixtures   # every custom rule: bad fixture fires, good fixture doesn't
bun run check:smoke      # consumer-style end-to-end check
```

Releases: [changesets](https://github.com/changesets/changesets) — add one per PR, CI publishes on merge.
