# @ashstack/lint

Strict shared [oxlint](https://oxc.rs) config: <!-- rule-counts -->118 rules on plain TypeScript, 202 with React, 257 on React Native, 74 of them custom-built<!-- /rule-counts -->. Three entries, each containing the one before it: `core()`, `react()`, `react-native()`.

Library-specific rules ship only when you depend on that library, so nothing fires about code you don't have.

The strictness is aimed at agents. One writes more code in an hour than anyone reviews line by line, and the linter is the only thing that reads all of it. Every message names the fix, so an agent can act on it without a second prompt.

## Install

```sh
bun add -d oxlint oxlint-tsgolint @ashstack/lint
```

```ts
// oxlint.config.mts (JSON configs can't resolve npm packages, so TS config only)
import { core } from "@ashstack/lint/core"; // or: /react, /react-native
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  rules: { "@ashstack/query/no-inline-keys": "off" }, // your overrides always win
});
```

```sh
oxlint --type-aware --deny-warnings .
```

Keep the `defineConfig` wrapper. It is what types the `rules` block, so a wrong
rule option is a compile error and hovering a rule id shows what it does and
links to its section here. A bare `export default { ... }` gets neither, silently
— `satisfies OxlintConfig` works too if you would rather not wrap.

Type-aware rules need the `oxlint-tsgolint` peer. Node 22.18+.

Import the entry you use. There is no package root to import from, so nothing
loads rule files you have no use for: `@ashstack/lint/core` loads 27 KB where
a root re-export of all three would load 137 KB. `react` and `react-native`
load most of it either way, since they configure most of the rules.

```ts
import { core } from "@ashstack/lint/core";
import { react } from "@ashstack/lint/react";
import { reactNative } from "@ashstack/lint/react-native";
```

Each entry also has a default export, and carries its own options type
(`CoreOptions`, `ReactOptions`, `ReactNativeOptions`).

## Monorepos

A nested config replaces the one above it rather than merging, so each workspace
config extends an entry itself. Its own `plugins` array is unioned with the
entry's, never swapped for it:

```ts
// apps/backend/oxlint.config.mts — a backend that also renders JSX templates
import { core } from "@ashstack/lint/core";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  plugins: ["react", "jsx-a11y"],
  rules: { "react/jsx-key": "error" },
});
```

Drop the `extends` and the workspace keeps only the rules it names, with no
diagnostic that the rest are gone.

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

<!-- opt-in -->Off by default, since they need a team decision first: `@ashstack/core/use-design-system` and `@ashstack/core/components-tsx-only`.<!-- /opt-in -->

## Rule reference

[RULES.md](https://github.com/AlshehriAli0/ashStack/blob/main/packages/lint/RULES.md) covers every rule, with options and examples. It is generated from the rules and CI-checked.

## License

MIT
