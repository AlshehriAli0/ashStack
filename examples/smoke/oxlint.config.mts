// This is exactly what a consumer writes.
import { reactNative } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  // zod is in this package's deps -> zod/ rules auto-enable; turbo-image etc.
  // are not -> their rules stay out of the config entirely.
  extends: [reactNative()],
  rules: {
    // consumer override check: this must silence the rule in src/overridden.ts
    "no-nested-ternary": "off",
  },
});
