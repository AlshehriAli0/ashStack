import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { RnContext } from "./shared.js";

const IOS_ONLY_EVENT_NAMES = new Set(["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame"]);

const MESSAGE =
  "Drive this from `rt.insets.ime`, which updates per frame on both platforms, or from a `react-native-keyboard-controller` component. `keyboardWill*` events are iOS-only, so on Android the listener registers and never fires.";

const isIosOnlyEventName = (node: AstNode): boolean =>
  typeof node.value === "string" && IOS_ONLY_EVENT_NAMES.has(node.value);

export const noKeyboardWillEvents: Rule = problem(
  "Bans the `keyboardWill*` event names. They are iOS-only, so on Android the listener registers and never fires.",
  {
    createOnce(context: RnContext) {
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
