import core, { coreModules } from "../core/index.js";
import { effectPlugin } from "../lib/effect-plugin.js";
import { mergeConfigs } from "../lib/merge.js";
import { composeModules } from "../lib/module.js";
import type { OxlintConfig, ReactOptions, RuleMap } from "../lib/types.js";
import i18nModule from "./rules/i18n/index.js";
import queryModule from "./rules/query/index.js";
import reactWebModule from "./rules/react/index.js";
import tailwindModule from "./rules/tailwind/index.js";
import tanstackRouterModule from "./rules/tanstack-router/index.js";
import zustandModule from "./rules/zustand/index.js";

export const reactModules = [
  reactWebModule,
  queryModule,
  zustandModule,
  i18nModule,
  tailwindModule,
  tanstackRouterModule,
];

const ALLOW_EMPTY_NOOP_HANDLERS: RuleMap = {
  "eslint/no-empty": "off",
  "eslint/no-empty-function": "off",
};

const REACT_COMPILER_RULES: RuleMap = {
  "react/error-boundaries": "error",
  "react/globals": "error",
  "react/immutability": "error",
  "react/incompatible-library": "error",
  "react/preserve-manual-memoization": "error",
  "react/purity": "error",
  "react/refs": "error",
  "react/set-state-in-effect": "error",
  "react/set-state-in-render": "error",
  "react/static-components": "error",
  "react/use-memo": "error",
  "react/void-use-memo": "error",
  "react/capitalized-calls": "error",
  "react/exhaustive-effect-dependencies": "error",
  "react/hooks": "error",
  "react/memo-dependencies": "error",
  "react/no-deriving-state-in-effects": "error",
  "react/invariant": "error",
  "react/rule-suppression": "error",
  "react/syntax": "error",
  "react/todo": "error",
  "react/unsupported-syntax": "error",
};

const FILE_BASED_ROUTER_FILES = ["**/routes/**", "**/src/app/**", "**/app/**/_layout.tsx", "**/app/**/+*.tsx"];

const REACT_RULES: RuleMap = {
  ...ALLOW_EMPTY_NOOP_HANDLERS,
  "max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
  "react/react-in-jsx-scope": "off",
  "react/style-prop-object": "off",
  "react/only-export-components": "off",
  "react/rules-of-hooks": "error",
  "react/exhaustive-deps": "error",
  "react/button-has-type": "error",
  "react/checked-requires-onchange-or-readonly": "error",
  "react/iframe-missing-sandbox": "error",
  "react/jsx-boolean-value": "error",
  "react/jsx-key": "error",
  "react/jsx-no-comment-textnodes": "error",
  "react/jsx-no-constructed-context-values": "error",
  "react/jsx-no-duplicate-props": "error",
  "react/jsx-no-target-blank": "error",
  "react/jsx-no-useless-fragment": "error",
  "react/no-array-index-key": "error",
  "react/no-children-prop": "error",
  "react/no-danger": "error",
  "react/no-danger-with-children": "error",
  "react/no-direct-mutation-state": "error",
  "react/no-is-mounted": "error",
  "react/no-render-return-value": "error",
  "react/no-string-refs": "error",
  "react/no-this-in-sfc": "error",
  "react/no-unsafe": "error",
  "react/no-unescaped-entities": "error",
  "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  "react/require-render-return": "error",
  "react/self-closing-comp": "error",
  "react/void-dom-elements-no-children": "error",
  ...REACT_COMPILER_RULES,
  "jsx-a11y/alt-text": "error",
  "jsx-a11y/anchor-has-content": "error",
  "jsx-a11y/anchor-is-valid": "error",
  "jsx-a11y/click-events-have-key-events": "off",
  "jsx-a11y/control-has-associated-label": "off",
  "jsx-a11y/heading-has-content": "error",
  "jsx-a11y/img-redundant-alt": "error",
  "jsx-a11y/interactive-supports-focus": "error",
  "jsx-a11y/label-has-associated-control": "error",
  "jsx-a11y/no-aria-hidden-on-focusable": "error",
  "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
  "jsx-a11y/no-noninteractive-element-interactions": "off",
  "jsx-a11y/no-noninteractive-tabindex": "error",
  "jsx-a11y/no-redundant-roles": "error",
  "jsx-a11y/no-static-element-interactions": "error",
  "jsx-a11y/prefer-tag-over-role": "off",
  "jsx-a11y/role-has-required-aria-props": "error",
  "jsx-a11y/role-supports-aria-props": "error",
  "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
};

/**
 * React (web) entry — everything in core plus react, jsx-a11y, React Compiler
 * diagnostics, you-might-not-need-an-effect, and the auto-detected library
 * modules (query, zustand, i18n).
 */
const react = (options: ReactOptions = {}): OxlintConfig => {
  const composed = composeModules([...coreModules, ...reactModules], options);
  const effect = effectPlugin();

  return mergeConfigs(core(options), {
    plugins: ["react", "jsx-a11y", "react-perf"],
    jsPlugins: [...effect.jsPlugins, ...composed.jsPlugins],
    rules: { ...REACT_RULES, ...effect.rules, ...composed.rules },
    overrides: [
      {
        files: FILE_BASED_ROUTER_FILES,
        rules: { "unicorn/filename-case": "off" },
      },
    ],
  });
};

export { react };
export type { ReactOptions, ModuleManifest } from "../lib/types.js";

export default react;
