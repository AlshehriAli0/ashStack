# @ashstack/lint

Strict shared [oxlint](https://oxc.rs) config: 147 rules on plain TypeScript, 227 with React, 238 on React Native, over 70 of them custom-built. Three entries, each containing the one before it: `core()`, `react()`, `react-native()`.

Library-specific rules ship only when you depend on that library, so nothing fires about code you don't have.

The strictness is aimed at agents. One writes more code in an hour than anyone reviews line by line, and the linter is the only thing that reads all of it. Every message names the fix, so an agent can act on it without a second prompt.

## Install

```sh
bun add -d oxlint oxlint-tsgolint @ashstack/lint
```

```ts
// oxlint.config.mts (JSON configs can't resolve npm packages, so TS config only)
import { core } from "@ashstack/lint"; // or: react, reactNative
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  rules: { "@ashstack/query/no-inline-keys": "off" }, // your overrides always win
});
```

```sh
oxlint --type-aware --deny-warnings .
```

Type-aware rules need the `oxlint-tsgolint` peer. Node 22.18+.

## What each entry adds

`core()` is a strict eslint / typescript / unicorn / promise / import base plus the `@ashstack/core/` convention rules. `react()` adds react, jsx-a11y, React Compiler and you-might-not-need-an-effect. `react-native()` adds the generic `@ashstack/react-native/` rules: leaked renders, view nesting, iOS-only keyboard events, remote images.

## Library-specific rules, auto-detected

One module per library: one rule namespace, one toggle. A module turns on when its library is in your `package.json`, searched up to the repo root.

`@ashstack/zod` · `@ashstack/query` · `@ashstack/zustand` · `@ashstack/i18n` · `@ashstack/unistyles` · `@ashstack/legend-list` · `@ashstack/legend-state` · `@ashstack/reanimated` · `@ashstack/turbo-image` · `@ashstack/skia` · `@ashstack/keyboard`

Detection only sets the default. Turn any module on or off yourself, whatever your dependencies say:

```ts
reactNative({ unistyles: false, i18n: true });
```

Import bans follow detection only; disable one by rule name.

## Opt-in rules

Off by default, since they need a team decision first: `@ashstack/core/no-comments`, `use-design-system` and `components-tsx-only`.

## Rule reference

[RULES.md](./RULES.md) covers every rule, with options and examples. It ships in this package, generated from the rules and CI-checked.

## License

MIT
