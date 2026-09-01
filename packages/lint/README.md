# @ashstack/lint

Strict shared [oxlint](https://oxc.rs) config with 71 custom rules. Three entries, each containing the one before it: `core()`, `react()`, `react-native()`.

Rules for a library only ship when you actually depend on that library, so nothing fires about code you don't have.

The strictness is aimed at agents. One will produce a hundred files in an hour, and the linter is the only thing that reads all of them. Every message names the fix rather than the symptom, so an agent can act on it without a second prompt.

## Install

```sh
bun add -d oxlint oxlint-tsgolint @ashstack/lint
```

```ts
// oxlint.config.mts (JSON configs can't resolve npm packages, so TS config only)
import { reactNative } from "@ashstack/lint"; // or: core, react
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [reactNative()],
  rules: { "@ashstack/unistyles/no-margin": "off" }, // your overrides always win
});
```

```sh
oxlint --type-aware --deny-warnings .
```

Type-aware rules need the `oxlint-tsgolint` peer. Node 22.18+.

## What each entry adds

`core()` is a strict eslint / typescript / unicorn / promise / import base plus the `@ashstack/core/` convention rules. `react()` adds react, jsx-a11y, React Compiler and you-might-not-need-an-effect. `react-native()` adds the generic `@ashstack/react-native/` rules: leaked renders, view nesting, iOS-only keyboard events, remote images.

## Library rules, auto-detected

A module is one rule namespace with one toggle, and turns on when its library is in your `package.json`. Detection walks up to the repo root, so monorepos work.

`@ashstack/zod` · `@ashstack/query` · `@ashstack/zustand` · `@ashstack/i18n` · `@ashstack/unistyles` · `@ashstack/legend-list` · `@ashstack/legend-state` · `@ashstack/reanimated` · `@ashstack/turbo-image` · `@ashstack/skia` · `@ashstack/keyboard`

Force one either way when detection guesses wrong:

```ts
reactNative({ unistyles: false, i18n: true });
```

Import bans are auto-detect only. To disagree with one, turn that rule off by name.

## Opt-in rules

Three rules ship off because they only make sense once a team has agreed to them: `@ashstack/core/no-comments`, `use-design-system` and `components-tsx-only`.

## Rule reference

[RULES.md](./RULES.md) lists every rule in every entry, with its options and a passing and failing example. It ships in this package and is generated from the rules themselves, so it can't drift.

## License

MIT
