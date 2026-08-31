// Dogfood the published config; repo-specific ignores on top.
import fmt from "@ashstack/fmt";

export default {
  ...fmt,
  ignorePatterns: ["**/node_modules/**", "CONTEXT.md", "docs/**", "**/fixtures/**", "packages/lint/RULES.md"],
};
