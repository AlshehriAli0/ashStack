// ashStack oxfmt defaults. oxfmt has no `extends`; consume via oxfmt.config.mts:
//
//   import fmt from "@ashstack/fmt";
//   export default fmt;
//
// Override by spreading: `export default { ...fmt, useTabs: true }`.
export default {
  useTabs: false,
  tabWidth: 2,
  printWidth: 120,
  endOfLine: "lf",
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "es5",
  semi: true,
  arrowParens: "avoid",
  bracketSameLine: false,
  bracketSpacing: true,
  singleAttributePerLine: false,
  objectWrap: "preserve",
  insertFinalNewline: true,
  sortPackageJson: false,
  sortImports: { newlinesBetween: true },
};
