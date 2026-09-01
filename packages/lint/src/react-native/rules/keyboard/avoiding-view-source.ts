import { gate, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Import `KeyboardAvoidingView` from `react-native-keyboard-controller` — same props, and it tracks the keyboard per frame instead of waiting for Android's post-animation `keyboardDidShow`. For a scrolling form use its `KeyboardAwareScrollView`; to just shift a view, use `rt.insets.ime`.";

export const avoidingViewSource: Rule = problem(
  "Bans `KeyboardAvoidingView` imported from react-native. It waits on `keyboardDidShow` and never subscribes to WindowInsetsAnimationCallback, so under edge-to-edge Android the input sits under the keyboard.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "KeyboardAvoidingView");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "react-native")) {
            if (specifier.type !== "ImportSpecifier") continue;
            const { imported } = specifier;
            if (imported.type !== "Identifier" || imported.name !== "KeyboardAvoidingView") continue;
            context.report({ node: specifier, message: MESSAGE });
          }
        },
      };
    },
  }
);
