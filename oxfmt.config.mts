import fmt from "@ashstack/fmt";

export default {
  ...fmt,
  ignorePatterns: ["**/fixtures/**", "packages/lint/RULES.md", "packages/lint/vendor/**"],
};
