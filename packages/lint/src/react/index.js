// @ashstack/lint — react entry. Extends core with react, jsx-a11y, React Compiler,
// you-might-not-need-an-effect, and (when the library is installed) TanStack Query,
// Zustand, and i18n rules.
import { fileURLToPath } from "node:url";

import core from "../core/index.js";
import { detect } from "../lib/detect.js";
import { mergeConfigs } from "../lib/merge.js";
import { ownPlugin } from "../lib/resolve.js";

const I18N_PACKAGES = [
  "i18next",
  "react-i18next",
  "@lingui/core",
  "react-intl",
  "use-intl",
  "next-intl",
  "expo-localization",
];

/**
 * React (web) entry — everything in core plus react, jsx-a11y, React Compiler
 * diagnostics, you-might-not-need-an-effect, and auto-detected library rules
 * (query, zustand, i18n).
 */
const react = (options = {}) => {
  const query = detect(options.query, ["@tanstack/react-query"]);
  const zustand = detect(options.zustand, ["zustand"]);
  const i18n = detect(options.i18n, I18N_PACKAGES);

  return mergeConfigs(core(options), {
    plugins: ["react", "jsx-a11y"],
    jsPlugins: [
      {
        name: "react-effect",
        specifier: fileURLToPath(import.meta.resolve("eslint-plugin-react-you-might-not-need-an-effect")),
      },
      ...(query ? [ownPlugin("react/rules/query.js")] : []),
      ...(zustand ? [ownPlugin("react/rules/zustand.js")] : []),
      ...(i18n ? [ownPlugin("react/rules/i18n.js")] : []),
    ],
    rules: {
      // web/react apps live on noop callbacks and empty default handlers
      "eslint/no-empty": "off",
      "eslint/no-empty-function": "off",
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
      // React Compiler diagnostics (oxlint react plugin, Aug 2026)
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
      "react-effect/no-derived-state": "error",
      "react-effect/no-chain-state-updates": "error",
      "react-effect/no-event-handler": "error",
      "react-effect/no-adjust-state-on-prop-change": "error",
      "react-effect/no-reset-all-state-on-prop-change": "error",
      "react-effect/no-pass-live-state-to-parent": "error",
      "react-effect/no-pass-data-to-parent": "error",
      "react-effect/no-external-store-subscription": "error",
      "react-effect/no-initialize-state": "error",
      "ash/hoist-intl": "error",
      "ash/no-naming-convention": "error",
      "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
      ...(query && {
        "query/no-inline-keys": "error",
        "query/no-deprecated-filters": "error",
        "query/require-destructured-hooks": "error",
        "query/no-fetch-in-query-fn": "error",
        "query/next-page-param-undefined": "error",
      }),
      ...(zustand && { "zustand/require-selector": "error" }),
      ...(i18n && {
        "i18n/no-bare-text": "error",
        "i18n/no-bare-attrs": "error",
        "i18n/no-bare-toast": "error",
      }),
    },
    overrides: [
      {
        // file-based routers own their filename conventions
        files: ["**/routes/**", "**/src/app/**", "**/app/**/_layout.tsx", "**/app/**/+*.tsx"],
        rules: { "unicorn/filename-case": "off" },
      },
    ],
  });
};

export default react;
