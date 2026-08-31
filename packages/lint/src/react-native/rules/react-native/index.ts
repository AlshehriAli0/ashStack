// @ashstack/react-native — general React Native rules, always on.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.
import { defineModule } from "../../../lib/module.js";
import { hoistStatelessFunction } from "./hoist-stateless-function.js";
import { noConditionalStyleArray } from "./no-conditional-style-array.js";
import { noDynamicImport } from "./no-dynamic-import.js";
import { noKeyboardWillEvents } from "./no-keyboard-will-events.js";
import { noLeakedRender } from "./no-leaked-render.js";
import { noManualMemo } from "./no-manual-memo.js";
import { noRedundantViewNesting } from "./no-redundant-view-nesting.js";
import { noRnImageNetworkSource } from "./no-rn-image-network-source.js";
import { noRnNamespaceImport } from "./no-rn-namespace-import.js";
import { noScrollPositionState } from "./no-scroll-position-state.js";
import { noUnlabeledIconPressable } from "./no-unlabeled-icon-pressable.js";

export default defineModule({
  meta: { name: "@ashstack/react-native" },
  url: import.meta.url,
  docsWhen: "always on via `reactNative()`",
  rules: {
    "no-keyboard-will-events": noKeyboardWillEvents,
    "no-scroll-position-state": noScrollPositionState,
    "no-conditional-style-array": noConditionalStyleArray,
    "no-leaked-render": noLeakedRender,
    "no-rn-image-network-source": noRnImageNetworkSource,
    "no-redundant-view-nesting": noRedundantViewNesting,
    "no-rn-namespace-import": noRnNamespaceImport,
    "no-unlabeled-icon-pressable": noUnlabeledIconPressable,
    "hoist-stateless-function": hoistStatelessFunction,
    "no-manual-memo": noManualMemo,
    "no-dynamic-import": noDynamicImport,
  },
  restrictedImports: {
    paths: [
      {
        name: "react",
        importNames: ["forwardRef"],
        message:
          "Accept `ref` as a regular prop and delete the `forwardRef` wrapper — React 19 passes `ref` like any other prop.",
      },
      {
        name: "react",
        importNames: ["useContext"],
        message: "Call `use(Context)` instead of `useContext(Context)`; React 19 replaces the hook with it.",
      },
    ],
    patterns: [
      {
        group: ["expo-linear-gradient", "react-native-linear-gradient"],
        message:
          "Apply the gradient through the `experimental_backgroundImage` style property instead of a gradient component.",
      },
    ],
  },
});
