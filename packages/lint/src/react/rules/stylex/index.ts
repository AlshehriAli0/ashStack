import { defineModule } from "../../../lib/module.js";
import { inlineProps } from "./inline-props.js";
import { noConflictingProps } from "./no-conflicting-props.js";
import { noDuplicateStyles } from "./no-duplicate-styles.js";
import { requireTokens } from "./require-tokens.js";

export default defineModule({
  meta: { name: "@ashstack/stylex" },
  url: import.meta.url,
  packages: ["@stylexjs/stylex"],
  option: "stylex",
  docsWhen: "auto-enabled by `react()` when `@stylexjs/stylex` is a dependency",
  rules: {
    "inline-props": inlineProps,
    "no-conflicting-props": noConflictingProps,
    "no-duplicate-styles": noDuplicateStyles,
    "require-tokens": requireTokens,
  },
});
