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

Two packages: [`@ashstack/lint`](packages/lint) and [`@ashstack/fmt`](packages/fmt). Install once per project instead of copying a lint config around and watching the copies drift.

- **147 rules** on plain TypeScript, **227** with React, **238** on React Native, over 70 of them custom-built
- library-specific rules ship only when you depend on that library: 13 self-detecting modules
- every rule is in [RULES.md](packages/lint/RULES.md), with options and examples, generated and CI-checked
- your `rules` block always wins

## Install

```sh
bun add -d oxlint oxfmt oxlint-tsgolint @ashstack/lint @ashstack/fmt
```

```ts
// oxlint.config.mts
import { core } from "@ashstack/lint"; // or: react, reactNative
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [core()] });
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

## Why it's this strict

An agent writes more code in an hour than anyone reads line by line, and unchecked it tangles: modules wound into each other, one problem solved three ways. Most of these rules exist to stop that.

The rest encode how a library expects to be used, so its anti-patterns get caught the first time. Every message names the fix.

## Three entries

Each returns one flat config. `react()` contains `core()`; `react-native()` contains both.

| Entry            | For                    | Adds                                                                                             |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `core()`         | any TypeScript project | strict eslint / typescript / unicorn / promise / import base, plus `@ashstack/core/` conventions |
| `react()`        | React on the web       | react, jsx-a11y, React Compiler, you-might-not-need-an-effect                                    |
| `react-native()` | Expo and React Native  | `@ashstack/react-native/`: leaked renders, view nesting, iOS-only keyboard events, remote images |

## Library-specific rules, auto-detected

One module per library: one rule namespace, one toggle. A module turns on when its library is in your `package.json`, searched up to the repo root.

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

Detection only sets the default. Turn any module on or off yourself, whatever your dependencies say:

```ts
reactNative({ unistyles: false, i18n: true });
```

## Overriding

```ts
export default defineConfig({
  extends: [reactNative()],
  rules: {
    complexity: ["error", { max: 20 }],
    "@ashstack/unistyles/no-margin": "off",
  },
});
```

Usual first cuts: `max-lines` (300), `max-lines-per-function` (120), `complexity` (12).

Off by default, since they need a team decision first: `@ashstack/core/no-comments`, `use-design-system`, `components-tsx-only`.

## Contributing

```sh
bun install
bun run test            # every custom rule and helper, asserted by message and position
bun run check:mutants   # breaks each rule on purpose; a test must notice
bun run lint            # this repo lints itself with core()
bun run check:smoke     # a real consumer app, end to end
bun run docs:rules      # regenerate RULES.md
```

Rule tests live in `tests/`, one file per module, and run through real oxlint. A case names the code, the expected message and the line it lands on. `check:mutants` then flips an operator in each compiled rule and re-runs that module's tests: a change no test notices is a hole in the suite.

Add a [changeset](https://github.com/changesets/changesets) with your PR. Releases run from a manual CI dispatch, not from the merge.

## License

MIT
