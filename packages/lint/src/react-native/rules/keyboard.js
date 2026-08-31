// @ashstack/lint — keyboard handling rules.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.

import { importedSpecifiers } from "../../lib/ast.js";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return typeof text !== "string" || markers.some(marker => text.includes(marker));
};

const NEW_MESSAGES = {
  keyboardAvoidingView:
    "Import `KeyboardAvoidingView` from `react-native-keyboard-controller` — same props, and it tracks the keyboard per frame instead of waiting for Android's post-animation `keyboardDidShow`. For a scrolling form use its `KeyboardAwareScrollView`; to just shift a view, use `rt.insets.ime`.",
};

const keyboardAvoidingViewSource = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing `KeyboardAvoidingView` from react-native; it listens for keyboardDidShow and never subscribes to WindowInsetsAnimationCallback, so under edge-to-edge Android it leaves the input under the keyboard — import it from react-native-keyboard-controller.",
    },
  },
  createOnce(context) {
    return {
      before() {
        return gate(context, "KeyboardAvoidingView");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "react-native")) {
          if (specifier.type !== "ImportSpecifier") continue;
          if (specifier.imported?.name !== "KeyboardAvoidingView") continue;
          context.report({ node: specifier, message: NEW_MESSAGES.keyboardAvoidingView });
        }
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/keyboard" },
  rules: {
    "avoiding-view-source": keyboardAvoidingViewSource,
  },
};
