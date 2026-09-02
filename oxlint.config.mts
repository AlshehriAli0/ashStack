import { core } from "@ashstack/lint/core";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  ignorePatterns: [
    "**/fixtures/**",
    "examples/**",
    "packages/lint/src/lib/registry.ts",
    "packages/lint/src/lib/rule-types/**",
    "packages/lint/vendor/**",
    "tests/corpus/**",
  ],
  rules: {
    "@ashstack/core/no-comments": ["error", { jsdoc: "allow" }],
  },
});
