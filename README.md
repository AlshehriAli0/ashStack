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

export default defineConfig({ extends: [reactNative] });
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

| Entry          | For                    | Adds                                                                                    |
| -------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `core`         | any TypeScript project | strict eslint/typescript/unicorn/promise base, `shared/` rules                          |
| `react`        | React (web)            | react + jsx-a11y + React Compiler + you-might-not-need-an-effect + TanStack Query rules |
| `react-native` | Expo / RN              | `rn/`, `unistyles/`, `legend-list/`, `state/` custom rules + stack import bans          |

Each entry is a flat, plain object — `react` already contains all of `core`.

## Overriding

Your `rules` block always wins:

```ts
export default defineConfig({
  extends: [reactNative],
  rules: {
    complexity: ["error", { max: 20 }],
    "unistyles/no-margin": "off",
  },
});
```

Rules people turn off first: `max-lines` / `max-lines-per-function` / `complexity` (size caps), `no-await-in-loop`, `typescript/no-unnecessary-condition` (noisy with imprecise types), `shared/no-naming-convention`, `unicorn/filename-case`, `shared/no-bare-jsx-text` (if not localizing), `typescript/no-floating-promises` (only if you can't run `--type-aware`).

Shipped but **off by default** (opt in): `shared/no-comments`, `shared/use-design-system`, `shared/components-tsx-only`.

## Development

```sh
bun install
bun run check:fixtures   # every custom rule: bad fixture fires, good fixture doesn't
bun run check:smoke      # consumer-style end-to-end check
```

Releases: [changesets](https://github.com/changesets/changesets) — add one per PR, CI publishes on merge.
