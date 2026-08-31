import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import type { RnContext } from "./shared.js";

const KEYBOARD_WILL_EVENTS = new Set(["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame"]);

const MESSAGE =
  "Drive this from `rt.insets.ime`, which updates per frame on both platforms, or from a `react-native-keyboard-controller` component. `keyboardWill*` events are iOS-only, so on Android the listener registers and never fires.";

// Every occurrence of the string counts, not only a listener argument: the
// event does not exist on Android wherever the name is written.
export const noKeyboardWillEvents: Rule = problem(
  "Bans the `keyboardWill*` event names. They are iOS-only, so on Android the listener registers and never fires.",
  {
    createOnce(context: RnContext) {
      return {
        before() {
          return gate(context, "keyboardWill");
        },
        Literal(node) {
          if (typeof node.value !== "string" || !KEYBOARD_WILL_EVENTS.has(node.value)) return;
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
