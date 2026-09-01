<h1 align="center">ashStack</h1>

<p align="center">
  One strict <a href="https://oxc.rs">oxc</a> setup for linting and formatting, shared across projects.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ashstack/lint"><img alt="npm" src="https://img.shields.io/npm/v/@ashstack/lint?color=%23111"></a>
  <a href="https://github.com/AlshehriAli0/ashStack/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/AlshehriAli0/ashStack/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/npm/l/@ashstack/lint?color=%23111"></a>
</p>

---

**ashStack is a strict [oxlint](https://oxc.rs) and [oxfmt](https://oxc.rs) setup** in two packages, [`@ashstack/lint`](packages/lint) and [`@ashstack/fmt`](packages/fmt). One install per project, instead of copying a lint config around and watching the copies drift.

**`react-native()` turns on 238 rules.** 71 of them are written here and documented in [RULES.md](packages/lint/RULES.md), each with a passing and a failing example. The rest is a strict base drawn from eslint, typescript-eslint, unicorn, promise, import, react and jsx-a11y.

**The strictness is aimed at agents.** One will produce a hundred files in an hour, and the linter is the only thing that reads all of them. Rules that would merely nag a person are what hold the line on generated code: no leaked renders, no `.value` writes React Compiler can't track, no hardcoded colors that skip dark mode. Every message names the fix rather than the symptom, so an agent can act on it without a second prompt.

**Rules for a library ship only when you depend on that library.** Thirteen modules detect themselves from your `package.json`, so nothing fires about code you don't have.

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

## Three entries

Each entry is a function that returns one flat config object. `react()` already contains all of `core()`, and `react-native()` contains both.

| Entry            | For                    | Adds                                                                                             |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `core()`         | any TypeScript project | strict eslint / typescript / unicorn / promise / import base, plus `@ashstack/core/` conventions |
| `react()`        | React on the web       | react, jsx-a11y, React Compiler, you-might-not-need-an-effect                                    |
| `react-native()` | Expo and React Native  | `@ashstack/react-native/`: leaked renders, view nesting, iOS-only keyboard events, remote images |

## Library rules, auto-detected

Each library gets a **module**: one rule namespace, one toggle. A module turns on when the library is in your `package.json`. Detection walks up to the repo root, so monorepos work.

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

**[RULES.md](packages/lint/RULES.md)** lists every rule in every entry, with its options and a passing and failing example. It is generated from the rules themselves and checked in CI, so it can't drift.

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
