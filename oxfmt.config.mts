import fmt from "@ashstack/fmt";

export default {
  ...fmt,
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/fixtures/**",
    "CONTEXT.md",
    "docs/**",
    "packages/lint/RULES.md",
  ],
};
