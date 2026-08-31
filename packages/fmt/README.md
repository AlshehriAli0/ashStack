# @ashstack/fmt

Shared oxfmt config. oxfmt has no `extends`, so consume it from `oxfmt.config.mts`:

```ts
import fmt from "@ashstack/fmt";
export default fmt;
// or override: export default { ...fmt, useTabs: true };
```

Defaults: 120 cols, double quotes, semicolons, es5 trailing commas, `arrowParens: "avoid"`, sorted imports.
