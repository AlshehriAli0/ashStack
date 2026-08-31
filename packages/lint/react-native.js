import { ownPlugin } from "./core.js";
// @ashstack/lint — react-native entry. Extends react with RN/Reanimated/Unistyles/
// Legend List/Legend State custom rules and the stack's import bans.
import { mergeConfigs } from "./lib/merge.js";
import react from "./react.js";

const reactNative = {
  jsPlugins: [
    ownPlugin("./plugins/rn.js"),
    ownPlugin("./plugins/unistyles.js"),
    ownPlugin("./plugins/legend-list.js"),
    ownPlugin("./plugins/state.js"),
  ],
  globals: { __DEV__: "readonly" },
  rules: {
    // noop handlers exemption is web-only; RN goes back to strict
    "eslint/no-empty": "error",
    "eslint/no-empty-function": "error",
    // fires on every RN gesture/animation effect; the pattern is idiomatic there
    "react-effect/no-event-handler": "off",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "react-native",
            importNames: ["StyleSheet"],
            message: "Use StyleSheet from react-native-unistyles instead of react-native.",
          },
          {
            name: "react-native",
            importNames: [
              "Pressable",
              "TouchableOpacity",
              "TouchableHighlight",
              "TouchableWithoutFeedback",
              "TouchableNativeFeedback",
            ],
            message:
              "Import Pressable from react-native-gesture-handler (it cooperates with the gesture system instead of competing with it). Exception: inside a SwiftUI/Compose host view touches never reach GestureHandlerRootView - keep RN's Pressable there and suppress this rule with the host named in the reason.",
          },
          {
            name: "react-native",
            importNames: ["FlatList", "SectionList", "VirtualizedList"],
            message:
              "Use LegendList from @legendapp/list/react-native. ScrollView plus map is fine for fewer than 20 static items.",
          },
          {
            name: "react-native",
            importNames: ["Animated"],
            message: "Use react-native-reanimated instead of the React Native Animated API.",
          },
          {
            name: "react-native",
            importNames: ["useWindowDimensions", "Dimensions"],
            message: "Use rt.screen from react-native-unistyles (UnistylesRuntime) instead of Dimensions APIs.",
          },
          {
            name: "react-native",
            importNames: ["SafeAreaView"],
            message:
              'Use contentInsetAdjustmentBehavior="automatic" on the scroll view, or rt.insets from react-native-unistyles.',
          },
          {
            name: "react-native-safe-area-context",
            importNames: ["useSafeAreaInsets", "useSafeAreaFrame", "SafeAreaView"],
            message: "Use rt.insets / UnistylesRuntime.insets from react-native-unistyles.",
          },
          {
            name: "react-native-reanimated",
            importNames: ["runOnJS", "runOnUI"],
            message:
              "runOnJS and runOnUI are deprecated. Use scheduleOnRN and scheduleOnUI from react-native-worklets.",
          },
          {
            name: "react-native-worklets",
            importNames: ["runOnJS", "runOnUI"],
            message:
              "runOnJS and runOnUI are deprecated. Use scheduleOnRN and scheduleOnUI from react-native-worklets.",
          },
          {
            name: "@legendapp/state/react",
            importNames: ["use$", "useSelector"],
            message: "use$ and useSelector are deprecated. Use useValue from @legendapp/state/react.",
          },
          {
            name: "react",
            importNames: ["forwardRef"],
            message: "React 19: ref is a regular prop. Drop forwardRef and accept ref directly.",
          },
          {
            name: "react",
            importNames: ["useContext"],
            message: "React 19: use(Context) replaces useContext.",
          },
          {
            name: "expo-font",
            importNames: ["useFonts", "loadAsync"],
            message: "Load fonts at build time via the expo-font config plugin, not at runtime.",
          },
          {
            name: "@shopify/flash-list",
            message: "FlashList was replaced by Legend List. Import LegendList from @legendapp/list/react-native.",
          },
          {
            name: "crypto-js",
            message: "crypto-js is pure JavaScript and slow. Use react-native-quick-crypto instead.",
          },
        ],
        patterns: [
          {
            group: ["expo-linear-gradient", "react-native-linear-gradient"],
            message: "Use the experimental_backgroundImage style property instead of gradient components.",
          },
          {
            group: ["@legendapp/list"],
            message: "Import from the platform entrypoint @legendapp/list/react-native, not the package root.",
          },
          {
            group: ["@react-navigation/stack", "@react-navigation/bottom-tabs"],
            message: "Use expo-router's Stack / NativeTabs instead of raw react-navigation navigators.",
          },
        ],
      },
    ],
    "shared/no-bare-jsx-text": "error",
    "shared/no-bare-jsx-attrs": "error",
    "shared/no-bare-toast": "error",
    "shared/no-dynamic-import": "error",
    "rn/animated-reaction-safety": "error",
    "rn/animated-style-needs-animated-component": "error",
    "rn/animated-updater-purity": "error",
    "rn/gpu-properties-only": "error",
    "rn/hoist-layout-animation-builder": "error",
    "rn/hoist-stateless-function": "error",
    "rn/interpolate-needs-clamp": "error",
    "rn/keyboard-avoiding-view-source": "error",
    "rn/no-keyboard-will-events": "error",
    "rn/no-scroll-position-state": "error",
    "rn/no-conditional-style-array": "error",
    "rn/no-leaked-render": "error",
    "rn/no-rn-image-network-source": "error",
    "rn/no-redundant-view-nesting": "error",
    "rn/no-react-state-from-continuous-worklet": "error",
    "rn/no-rn-namespace-import": "error",
    "rn/no-unlabeled-icon-pressable": "error",
    "rn/no-shared-value-dot-value": "error",
    "rn/no-manual-memo": "error",
    "rn/prefer-lazy-shared-value-initializer": "error",
    "rn/require-turbo-image-resize": "error",
    "rn/require-turbo-image-cache-policy": "error",
    "rn/schedule-on-rn-scope": "error",
    "rn/shared-value-usage": "error",
    "rn/skia-performance": "error",
    "unistyles/in-sheet": "error",
    "unistyles/insets": "error",
    "unistyles/content-container": "error",
    "unistyles/rtl-style-call": "error",
    "unistyles/theme-style-attr": "error",
    "unistyles/theme-screen-component": "error",
    "unistyles/animated-theme": "error",
    "unistyles/no-margin": "error",
    "unistyles/no-hardcoded-color": "error",
    "unistyles/no-hardcoded-spacing": "error",
    "unistyles/no-unused-styles": "error",
    "unistyles/no-style-spread": "error",
    "legend-list/required-props": "error",
    "legend-list/no-index-key-extractor": "error",
    "legend-list/no-remount-key": "error",
    "legend-list/no-inline-data": "error",
    "legend-list/no-inline-extra-data": "error",
    "legend-list/no-inline-render-item-props": "error",
    "legend-list/no-mixed-children": "error",
    "legend-list/no-flex-in-content-container": "error",
    "legend-list/typed-items-need-item-type": "error",
    "legend-list/no-scrollview-map": "error",
    "legend-list/no-unsupported-props": "error",
    "state/no-assignment": "error",
    "state/naming": "error",
    "state/no-nested-observable": "error",
    "state/no-react-mirror": "error",
    "state/no-untracked-get-in-jsx": "error",
    "state/no-peek-in-selector": "error",
    "state/no-object-selector": "error",
    "state/no-observable-in-component": "error",
  },
  ignorePatterns: ["**/.expo/**", "**/android/**", "**/ios/**"],
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/__tests__/**"],
      rules: {
        "shared/no-dynamic-import": "off",
        "rn/hoist-stateless-function": "off",
      },
    },
  ],
};

export default mergeConfigs(react, reactNative);
