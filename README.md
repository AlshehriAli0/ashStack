# ashStack

Shared, strict oxc tooling: [`@ashstack/lint`](packages/lint) (oxlint configs + custom rules) and [`@ashstack/fmt`](packages/fmt) (oxfmt config). One install per new project instead of hand-copying lint setups around.

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

| Entry            | For                    | Always adds                                                                                      |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `core()`         | any TypeScript project | strict eslint/typescript/unicorn/promise base + `@ashstack/core/` convention rules               |
| `react()`        | React (web)            | react + jsx-a11y + React Compiler + you-might-not-need-an-effect                                 |
| `react-native()` | Expo / RN              | generic `@ashstack/react-native/` rules (leaked renders, view nesting, keyboard events, images…) |

Each entry is a function returning a flat, plain config object — `react()` already contains all of `core()`.

## Library rule groups (auto-detected)

Library-specific rules ship only when you actually depend on that library — detected from your package.json (walking up, so monorepos work). Every group below is a **module**: one rule namespace, one boolean to force it either way, e.g. `reactNative({ unistyles: false, i18n: true })`. Only the import bans (and the React Compiler gate on `@ashstack/react-native/no-manual-memo`) are auto-detect-only — to disagree with one rule, turn that rule off by name.

| Group / rule prefix                                 | Enabled when you depend on                                   |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `@ashstack/zod/`                                    | `zod`                                                        |
| `@ashstack/query/`                                  | `@tanstack/react-query`                                      |
| `@ashstack/zustand/`                                | `zustand`                                                    |
| `@ashstack/i18n/`                                   | i18next / lingui / react-intl / use-intl / expo-localization |
| `@ashstack/unistyles/` + bans                       | `react-native-unistyles`                                     |
| `@ashstack/legend-list/` + bans                     | `@legendapp/list`                                            |
| `@ashstack/legend-state/` + ban                     | `@legendapp/state`                                           |
| `@ashstack/reanimated/` + bans                      | `react-native-reanimated`                                    |
| `@ashstack/turbo-image/`                            | `react-native-turbo-image`                                   |
| `@ashstack/skia/`                                   | `@shopify/react-native-skia`                                 |
| `@ashstack/keyboard/`                               | `react-native-keyboard-controller`                           |
| Pressable / router / font / crypto bans (auto-only) | the matching library                                         |

Every custom rule is documented in [packages/lint/RULES.md](packages/lint/RULES.md) — description, options, examples — generated from the rules themselves (`bun run docs:rules`, checked in CI).

## Overriding

Your `rules` block always wins:

```ts
export default defineConfig({
  extends: [reactNative()],
  rules: {
    complexity: ["error", { max: 20 }],
    "@ashstack/unistyles/no-margin": "off",
  },
});
```

Rules people turn off first: `max-lines` / `max-lines-per-function` / `complexity` (size caps), `no-await-in-loop`, `typescript/no-unnecessary-condition` (noisy with imprecise types), `@ashstack/core/no-naming-convention`, `unicorn/filename-case`, `typescript/no-floating-promises` (only if you can't run `--type-aware`).

Shipped but **off by default** (opt in): `@ashstack/core/no-comments`, `@ashstack/core/use-design-system`, `@ashstack/core/components-tsx-only`.

## Development

```sh
bun install
bun run lint             # this repo lints itself with core()
bun run check:fixtures   # every custom rule: bad fixture fires, good fixture doesn't
bun run check:smoke      # consumer-style end-to-end check
bun run docs:rules       # regenerate RULES.md
```

Releases: [changesets](https://github.com/changesets/changesets) — add one per PR, CI publishes on merge.
