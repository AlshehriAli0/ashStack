import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const IOS_ONLY_EVENT_NAMES = new Set(["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame"]);

const MESSAGE =
  "Drive this from `rt.insets.ime`, or a `react-native-keyboard-controller` component — `keyboardWill*` is iOS-only, so on Android the listener never fires.";

const isIosOnlyEventName = (node: AstNode): boolean =>
  node.type === "Literal" && typeof node.value === "string" && IOS_ONLY_EVENT_NAMES.has(node.value);

export const noKeyboardWillEvents: Rule = problem(
  "Disallow the `keyboardWill*` event names. They are iOS-only, so on Android the listener registers and never fires.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "keyboardWill");
        },
        Literal(node) {
          if (!isIosOnlyEventName(node)) return;
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
