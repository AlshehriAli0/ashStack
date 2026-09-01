import { core } from "@ashstack/lint";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [core()],
  ignorePatterns: ["**/dist/**", "**/fixtures/**", "examples/**", "**/node_modules/**"],
  rules: {
    "@ashstack/core/no-comments": ["error", { jsdoc: "allow" }],
  },
});
