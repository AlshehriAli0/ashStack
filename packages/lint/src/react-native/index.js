// @ashstack/lint — react-native entry. Extends react with generic RN rules always on,
// and per-library rule groups (unistyles, Legend List, Legend State, Reanimated,
// Turbo Image, Skia, keyboard-controller, …) enabled only when the consumer
// depends on that library. Import bans that push a library are gated the same way.
import { detect } from "../lib/detect.js";
import { mergeConfigs } from "../lib/merge.js";
import { ownPlugin } from "../lib/resolve.js";
import react from "../react/index.js";

const restrictedImports = ({
  unistyles,
  gestureHandler,
  legendList,
  reanimated,
  legendState,
  expoRouter,
  expoFont,
  quickCrypto,
}) => ({
  paths: [
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
    ...(unistyles
      ? [
          {
            name: "react-native",
            importNames: ["StyleSheet"],
            message: "Use StyleSheet from react-native-unistyles instead of react-native.",
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
        ]
      : []),
    ...(gestureHandler
      ? [
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
        ]
      : []),
    ...(legendList
      ? [
          {
            name: "react-native",
            importNames: ["FlatList", "SectionList", "VirtualizedList"],
            message:
              "Use LegendList from @legendapp/list/react-native. ScrollView plus map is fine for fewer than 20 static items.",
          },
          {
            name: "@shopify/flash-list",
            message: "FlashList was replaced by Legend List. Import LegendList from @legendapp/list/react-native.",
          },
        ]
      : []),
    ...(reanimated
      ? [
          {
            name: "react-native",
            importNames: ["Animated"],
            message: "Use react-native-reanimated instead of the React Native Animated API.",
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
        ]
      : []),
    ...(legendState
      ? [
          {
            name: "@legendapp/state/react",
            importNames: ["use$", "useSelector"],
            message: "use$ and useSelector are deprecated. Use useValue from @legendapp/state/react.",
          },
        ]
      : []),
    ...(expoFont
      ? [
          {
            name: "expo-font",
            importNames: ["useFonts", "loadAsync"],
            message: "Load fonts at build time via the expo-font config plugin, not at runtime.",
          },
        ]
      : []),
    ...(quickCrypto
      ? [
          {
            name: "crypto-js",
            message: "crypto-js is pure JavaScript and slow. Use react-native-quick-crypto instead.",
          },
        ]
      : []),
  ],
  patterns: [
    {
      group: ["expo-linear-gradient", "react-native-linear-gradient"],
      message: "Use the experimental_backgroundImage style property instead of gradient components.",
    },
    ...(legendList
      ? [
          {
            group: ["@legendapp/list"],
            message: "Import from the platform entrypoint @legendapp/list/react-native, not the package root.",
          },
        ]
      : []),
    ...(expoRouter
      ? [
          {
            group: ["@react-navigation/stack", "@react-navigation/bottom-tabs"],
            message: "Use expo-router's Stack / NativeTabs instead of raw react-navigation navigators.",
          },
        ]
      : []),
  ],
});

/**
 * React Native / Expo entry — everything in react plus generic RN rules, with
 * per-library groups (unistyles, legendList, legendState, reanimated,
 * turboImage, skia, keyboard, gestureHandler, expoRouter, …) auto-detected
 * from the consumer's dependencies. Pass explicit booleans to force.
 */
const reactNative = (options = {}) => {
  const groups = {
    unistyles: detect(options.unistyles, ["react-native-unistyles"]),
    legendList: detect(options.legendList, ["@legendapp/list"]),
    legendState: detect(options.legendState, ["@legendapp/state"]),
    reanimated: detect(options.reanimated, ["react-native-reanimated"]),
    turboImage: detect(options.turboImage, ["react-native-turbo-image"]),
    skia: detect(options.skia, ["@shopify/react-native-skia"]),
    keyboard: detect(options.keyboard, ["react-native-keyboard-controller"]),
    gestureHandler: detect(options.gestureHandler, ["react-native-gesture-handler"]),
    expoRouter: detect(options.expoRouter, ["expo-router"]),
    expoFont: detect(options.expoFont, ["expo-font"]),
    quickCrypto: detect(options.quickCrypto, ["react-native-quick-crypto"]),
    reactCompiler: detect(options.reactCompiler, [
      "babel-plugin-react-compiler",
      "react-compiler-runtime",
      "react-compiler-marker",
    ]),
  };

  return mergeConfigs(react(options), {
    jsPlugins: [
      ownPlugin("react-native/rules/base.js"),
      ...(groups.unistyles ? [ownPlugin("react-native/rules/unistyles.js")] : []),
      ...(groups.legendList ? [ownPlugin("react-native/rules/legend-list.js")] : []),
      ...(groups.legendState ? [ownPlugin("react-native/rules/legend-state.js")] : []),
    ],
    globals: { __DEV__: "readonly" },
    rules: {
      // noop handlers exemption is web-only; RN goes back to strict
      "eslint/no-empty": "error",
      "eslint/no-empty-function": "error",
      // fires on every RN gesture/animation effect; the pattern is idiomatic there
      "react-effect/no-event-handler": "off",
      "no-restricted-imports": ["error", restrictedImports(groups)],
      "ash/no-dynamic-import": "error",
      // generic RN — always on
      "rn/no-keyboard-will-events": "error",
      "rn/no-scroll-position-state": "error",
      "rn/no-conditional-style-array": "error",
      "rn/no-leaked-render": "error",
      "rn/no-rn-image-network-source": "error",
      "rn/no-redundant-view-nesting": "error",
      "rn/no-rn-namespace-import": "error",
      "rn/no-unlabeled-icon-pressable": "error",
      "rn/hoist-stateless-function": "error",
      ...(groups.reactCompiler && { "rn/no-manual-memo": "error" }),
      ...(groups.reanimated && {
        "rn/animated-reaction-safety": "error",
        "rn/animated-style-needs-animated-component": "error",
        "rn/animated-updater-purity": "error",
        "rn/gpu-properties-only": "error",
        "rn/hoist-layout-animation-builder": "error",
        "rn/interpolate-needs-clamp": "error",
        "rn/no-shared-value-dot-value": "error",
        "rn/no-react-state-from-continuous-worklet": "error",
        "rn/prefer-lazy-shared-value-initializer": "error",
        "rn/schedule-on-rn-scope": "error",
        "rn/shared-value-usage": "error",
      }),
      ...(groups.turboImage && {
        "rn/require-turbo-image-resize": "error",
        "rn/require-turbo-image-cache-policy": "error",
      }),
      ...(groups.skia && { "rn/skia-performance": "error" }),
      ...(groups.keyboard && { "rn/keyboard-avoiding-view-source": "error" }),
      ...(groups.unistyles && {
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
      }),
      ...(groups.legendList && {
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
      }),
      ...(groups.legendState && {
        "legend-state/no-assignment": "error",
        "legend-state/naming": "error",
        "legend-state/no-nested-observable": "error",
        "legend-state/no-react-mirror": "error",
        "legend-state/no-untracked-get-in-jsx": "error",
        "legend-state/no-peek-in-selector": "error",
        "legend-state/no-object-selector": "error",
        "legend-state/no-observable-in-component": "error",
      }),
    },
    ignorePatterns: ["**/.expo/**", "**/android/**", "**/ios/**"],
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/__tests__/**"],
        rules: {
          "ash/no-dynamic-import": "off",
          "rn/hoist-stateless-function": "off",
        },
      },
    ],
  });
};

export default reactNative;
