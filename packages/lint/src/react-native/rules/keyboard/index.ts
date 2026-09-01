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
