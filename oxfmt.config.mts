import fmt from "@ashstack/fmt";

export default {
  ...fmt,
  ignorePatterns: ["**/fixtures/**", "packages/lint/RULES.md"],
};
