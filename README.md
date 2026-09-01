<h1 align="center">ashStack</h1>

<p align="center">
  One strict <a href="https://oxc.rs">oxc</a> setup — lint and format — shared across every project.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ashstack/lint"><img alt="npm" src="https://img.shields.io/npm/v/@ashstack/lint?color=%23111"></a>
  <a href="https://github.com/AlshehriAli0/ashStack/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/AlshehriAli0/ashStack/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/npm/l/@ashstack/lint?color=%23111"></a>
</p>

---

Two packages: [`@ashstack/lint`](packages/lint) (oxlint config + 71 custom rules) and [`@ashstack/fmt`](packages/fmt) (oxfmt config). One install per project instead of copying a lint setup around and watching the copies drift.

Rules for a library only ship when you actually depend on that library, so the config is strict without being noise.

## Install

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

> `.mts` config files are the only supported path: oxlint's JSON `extends` can't resolve npm packages, and oxfmt has no `extends` at all. Needs Node 22.18+.

## What it catches

Beyond the base config, the custom rules encode the mistakes that survive review and fail in production:

| You wrote                                            | What happens                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `{items.length && <List />}`                         | a bare `0` leaks into JSX and crashes RN with _Text strings must be rendered within a `<Text>`_ |
| `offset.value = y`                                   | React Compiler can't track a `.value` access — use `.get()` / `.set()`                          |
| `<LegendList key={id} />`                            | remounts on every key change, losing measurements and scroll position — pass `dataKey`          |
| `backgroundColor: "#111"` inside `StyleSheet.create` | skips dark mode and never follows the theme                                                     |

Every message says what to do instead, not just what's wrong — they're written to be actionable by a coding agent as well as a human.

## Three entries

Each is a function returning one flat config object. Each contains the one before it.

| Entry            | For                    | Adds                                                                                              |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `core()`         | any TypeScript project | strict eslint / typescript / unicorn / promise / import base, plus `@ashstack/core/` conventions  |
| `react()`        | React on the web       | react, jsx-a11y, React Compiler, you-might-not-need-an-effect                                     |
| `react-native()` | Expo and React Native  | `@ashstack/react-native/` — leaked renders, view nesting, iOS-only keyboard events, remote images |

## Library rules, auto-detected

Each library gets a **module**: one rule namespace, one toggle. A module turns on when the library is in your `package.json` — walking up to the repo root, so monorepos work.

| Module                   | Detected from                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `@ashstack/zod`          | `zod`                                                                                    |
| `@ashstack/query`        | `@tanstack/react-query`                                                                  |
| `@ashstack/zustand`      | `zustand`                                                                                |
| `@ashstack/i18n`         | i18next · react-i18next · lingui · react-intl · use-intl · next-intl · expo-localization |
| `@ashstack/unistyles`    | `react-native-unistyles`                                                                 |
| `@ashstack/legend-list`  | `@legendapp/list`                                                                        |
| `@ashstack/legend-state` | `@legendapp/state`                                                                       |
| `@ashstack/reanimated`   | `react-native-reanimated`                                                                |
| `@ashstack/turbo-image`  | `react-native-turbo-image`                                                               |
| `@ashstack/skia`         | `@shopify/react-native-skia`                                                             |
| `@ashstack/keyboard`     | `react-native-keyboard-controller`                                                       |

Force one either way when detection guesses wrong:

```ts
reactNative({ unistyles: false, i18n: true });
```

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

The size caps go first for most people: `max-lines` (300), `max-lines-per-function` (120) and `complexity` (12).

Three rules ship **off** because they only make sense once a team has agreed to them: `@ashstack/core/no-comments`, `use-design-system`, `components-tsx-only`.

## Rule reference

**[RULES.md](packages/lint/RULES.md)** — every rule in every entry, with its options and a passing and failing example. Generated from the rules themselves and checked in CI, so it can't drift.

## Contributing

```sh
bun install
bun run lint            # this repo lints itself with core()
bun run check:fixtures  # every rule: the bad fixture fires, the good one doesn't
bun run check:smoke     # a real consumer app, end to end
bun run docs:rules      # regenerate RULES.md
```

Add a [changeset](https://github.com/changesets/changesets) with your PR; CI publishes on merge.

## License

MIT
