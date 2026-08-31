// @ashstack/keyboard — keyboard handling rules, on when
// react-native-keyboard-controller is a dependency.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.
import { defineModule } from "../../../lib/module.js";
import { avoidingViewSource } from "./avoiding-view-source.js";

export default defineModule({
  meta: { name: "@ashstack/keyboard" },
  url: import.meta.url,
  packages: ["react-native-keyboard-controller"],
  option: "keyboard",
  docsWhen: "auto-enabled when `react-native-keyboard-controller` is a dependency",
  rules: {
    "avoiding-view-source": avoidingViewSource,
  },
});
