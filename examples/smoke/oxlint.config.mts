// This is exactly what a consumer writes.
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [reactNative],
  rules: {
    // consumer override check: this must silence the rule in src/overridden.ts
    "no-nested-ternary": "off",
  },
});
