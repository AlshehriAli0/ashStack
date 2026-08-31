// react-native-unistyles conventions.
//
// Two of these catch SILENT failures — a spread style and a raw hex both render
// fine and simply stop reacting to the theme. The rest keep styles on the
// theme's scale and inside StyleSheet.create, where Unistyles can recalculate
// them natively.
//
// Rules use createOnce so per-file state survives one traversal, and a before()
// text gate where a cheap marker can rule the file out. Gates fail OPEN — if the
// source text is unavailable the rule still runs, because a missed gate costs
// milliseconds and a wrong gate costs correctness.
import { defineModule } from "../../../lib/module.js";
import { animatedTheme } from "./animated-theme.js";
import { contentContainer } from "./content-container.js";
import { inSheet } from "./in-sheet.js";
import { insets } from "./insets.js";
import { noHardcodedColor } from "./no-hardcoded-color.js";
import { noHardcodedSpacing } from "./no-hardcoded-spacing.js";
import { noMargin } from "./no-margin.js";
import { noStyleSpread } from "./no-style-spread.js";
import { noUnusedStyles } from "./no-unused-styles.js";
import { rtlStyleCall } from "./rtl-style-call.js";
import { themeScreenComponent } from "./theme-screen-component.js";
import { themeStyleAttr } from "./theme-style-attr.js";

export default defineModule({
  meta: { name: "@ashstack/unistyles" },
  rules: {
    "animated-theme": animatedTheme,
    "content-container": contentContainer,
    "in-sheet": inSheet,
    insets: insets,
    "no-hardcoded-color": noHardcodedColor,
    "no-hardcoded-spacing": noHardcodedSpacing,
    "no-margin": noMargin,
    "no-style-spread": noStyleSpread,
    "no-unused-styles": noUnusedStyles,
    "rtl-style-call": rtlStyleCall,
    "theme-screen-component": themeScreenComponent,
    "theme-style-attr": themeStyleAttr,
  },
  url: import.meta.url,
  packages: ["react-native-unistyles"],
  option: "unistyles",
  docsWhen: "auto-enabled when `react-native-unistyles` is a dependency",
  restrictedImports: {
    paths: [
      {
        name: "react-native",
        importNames: ["StyleSheet"],
        message: "Import `StyleSheet` from `react-native-unistyles` instead of `react-native`.",
      },
      {
        name: "react-native",
        importNames: ["useWindowDimensions", "Dimensions"],
        message:
          "Read screen size from `rt.screen` inside `StyleSheet.create`, or `UnistylesRuntime.screen` outside it, instead of the `Dimensions` APIs.",
      },
      {
        name: "react-native",
        importNames: ["SafeAreaView"],
        message:
          'Set `contentInsetAdjustmentBehavior="automatic"` on the scroll view, or apply `rt.insets` from `react-native-unistyles`, instead of `SafeAreaView`.',
      },
      {
        name: "react-native-safe-area-context",
        importNames: ["useSafeAreaInsets", "useSafeAreaFrame", "SafeAreaView"],
        message:
          "Read safe-area values from `rt.insets`, or `UnistylesRuntime.insets` outside a stylesheet, in `react-native-unistyles`.",
      },
    ],
  },
});
