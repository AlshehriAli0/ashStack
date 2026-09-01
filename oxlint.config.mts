import { core } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  ignorePatterns: ["**/fixtures/**", "examples/**"],
  rules: {
    "@ashstack/core/no-comments": ["error", { jsdoc: "allow" }],
  },
});
