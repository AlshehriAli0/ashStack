import { defineModule } from "../../../lib/module.js";

export default defineModule({
  meta: { name: "@ashstack/keyboard" },
  url: import.meta.url,
  packages: ["react-native-keyboard-controller"],
  option: "keyboard",
  docsWhen: "auto-enabled when `react-native-keyboard-controller` is a dependency",
  rules: {},
  restrictedImports: {
    paths: [
      {
        name: "react-native",
        importNames: ["KeyboardAvoidingView"],
        message:
          "Import `KeyboardAvoidingView` from `react-native-keyboard-controller` — same props, tracked per frame. For a scrolling form, its `KeyboardAwareScrollView`.",
      },
    ],
  },
});
