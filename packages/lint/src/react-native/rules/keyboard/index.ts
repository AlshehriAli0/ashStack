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
          "Import `KeyboardAvoidingView` from `react-native-keyboard-controller` — same props, and it tracks the keyboard per frame instead of waiting for Android's post-animation `keyboardDidShow`. For a scrolling form use its `KeyboardAwareScrollView`; to just shift a view, use `rt.insets.ime`.",
      },
    ],
  },
});
