import core from "../core/index.js";
import { EFFECT_RULES, effectPlugin } from "../lib/effect-plugin.js";
import { mergeConfigs } from "../lib/merge.js";
import { composeModules } from "../lib/module.js";
import { coreRegistry, reactRegistry } from "../lib/registry.js";
import type { OxlintConfig, ReactOptions, RuleMap } from "../lib/types.js";

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
  // why: @ashstack/effects reports these positions naming the refactor, not the symptom
  "react/set-state-in-effect": "off",
  "react/set-state-in-render": "error",
  "react/static-components": "error",
  "react/use-memo": "error",
  "react/void-use-memo": "error",
  "react/capitalized-calls": "error",
  "react/exhaustive-effect-dependencies": "error",
  "react/hooks": "error",
  "react/memo-dependencies": "error",
  // why: duplicates @ashstack/effects/no-derived-state at the same position
  "react/no-deriving-state-in-effects": "off",
  "react/invariant": "error",
  "react/rule-suppression": "error",
  "react/syntax": "error",
  "react/todo": "error",
  "react/unsupported-syntax": "error",
};

/**
 * Every rule whose whole complaint is "this value is allocated during render,
 * so its identity changes". The React Compiler memoises exactly these, and
 * each one's suggested fix is a `useMemo` that `no-manual-memo` then asks you
 * to justify. Named here because `core()` turns the whole `perf` category on,
 * so most of them arrive unasked otherwise.
 */
const renderIdentityRules = (reactCompiler: boolean): RuleMap => {
  const severity = reactCompiler ? "off" : "error";
  return {
    "react-perf/jsx-no-jsx-as-prop": severity,
    "react-perf/jsx-no-new-array-as-prop": severity,
    "react-perf/jsx-no-new-function-as-prop": severity,
    "react-perf/jsx-no-new-object-as-prop": severity,
    "react/jsx-no-constructed-context-values": severity,
    "react/no-object-type-as-default-prop": severity,
  };
};

const FILE_BASED_ROUTER_FILES = ["**/routes/**", "**/src/app/**", "**/app/**/_layout.tsx", "**/app/**/+*.tsx"];

/**
 * Tighter than core's 300, for the same reason `max-lines-per-function` is:
 * a module of exported functions grows honestly, a component file past this
 * is several components. Styles are already out of the count —
 * `@ashstack/core/max-lines` discounts `StyleSheet.create` and
 * `stylex.create` — so every line left is one a reader has to follow.
 */
export const COMPONENT_MAX_LINES = 250;

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
 *
 * @see [every rule `react()` sets](https://github.com/AlshehriAli0/ashStack/blob/main/packages/lint/RULES.md#react)
 */
const react = (options: ReactOptions = {}): OxlintConfig => {
  const composed = composeModules([...coreRegistry, ...reactRegistry], options);

  return mergeConfigs(core(options), {
    plugins: ["react", "jsx-a11y", "react-perf"],
    jsPlugins: [effectPlugin, ...composed.jsPlugins],
    rules: {
      ...REACT_RULES,
      ...renderIdentityRules(options.reactCompiler ?? true),
      ...EFFECT_RULES,
      ...composed.rules,
      "@ashstack/core/max-lines": ["error", COMPONENT_MAX_LINES],
    },
    overrides: [
      {
        files: FILE_BASED_ROUTER_FILES,
        rules: { "unicorn/filename-case": "off" },
      },
    ],
  });
};

export { react };
export type { CoreRuleId } from "../lib/rule-types/core.js";
export type { ReactRuleId } from "../lib/rule-types/react.js";
export type { ReactOptions, ModuleManifest } from "../lib/types.js";

export default react;
