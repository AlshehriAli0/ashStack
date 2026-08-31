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
      message:
        "Accept `ref` as a regular prop and delete the `forwardRef` wrapper — React 19 passes `ref` like any other prop.",
    },
    {
      name: "react",
      importNames: ["useContext"],
      message: "Call `use(Context)` instead of `useContext(Context)`; React 19 replaces the hook with it.",
    },
    ...(unistyles
      ? [
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
              "Import `Pressable` from `react-native-gesture-handler` so it cooperates with the gesture system instead of competing with it. Exception: inside a SwiftUI/Compose host view touches never reach `GestureHandlerRootView` — keep React Native's `Pressable` there and suppress this rule with the host named in the reason.",
          },
        ]
      : []),
    ...(legendList
      ? [
          {
            name: "react-native",
            importNames: ["FlatList", "SectionList", "VirtualizedList"],
            message:
              "Render this list with `LegendList` from `@legendapp/list/react-native`; a `ScrollView` plus `map` is fine for fewer than 20 static items.",
          },
          {
            name: "@shopify/flash-list",
            message:
              "Import `LegendList` from `@legendapp/list/react-native` — Legend List replaced FlashList in this stack.",
          },
        ]
      : []),
    ...(reanimated
      ? [
          {
            name: "react-native",
            importNames: ["Animated"],
            message: "Use `react-native-reanimated` instead of React Native's `Animated` API.",
          },
          {
            name: "react-native-reanimated",
            importNames: ["runOnJS", "runOnUI"],
            message:
              "Use `scheduleOnRN` and `scheduleOnUI` from `react-native-worklets`; `runOnJS` and `runOnUI` are deprecated.",
          },
          {
            name: "react-native-worklets",
            importNames: ["runOnJS", "runOnUI"],
            message:
              "Use `scheduleOnRN` and `scheduleOnUI` from `react-native-worklets`; `runOnJS` and `runOnUI` are deprecated.",
          },
        ]
      : []),
    ...(legendState
      ? [
          {
            name: "@legendapp/state/react",
            importNames: ["use$", "useSelector"],
            message: "Use `useValue` from `@legendapp/state/react`; `use$` and `useSelector` are deprecated.",
          },
        ]
      : []),
    ...(expoFont
      ? [
          {
            name: "expo-font",
            importNames: ["useFonts", "loadAsync"],
            message:
              "Declare the fonts in the `expo-font` config plugin so they load at build time, instead of `useFonts`/`loadAsync` at runtime.",
          },
        ]
      : []),
    ...(quickCrypto
      ? [
          {
            name: "crypto-js",
            message:
              "Use `react-native-quick-crypto` instead — `crypto-js` is pure JavaScript and runs orders of magnitude slower.",
          },
        ]
      : []),
  ],
  patterns: [
    {
      group: ["expo-linear-gradient", "react-native-linear-gradient"],
      message:
        "Apply the gradient through the `experimental_backgroundImage` style property instead of a gradient component.",
    },
    ...(legendList
      ? [
          {
            group: ["@legendapp/list"],
            message: "Import from the platform entrypoint `@legendapp/list/react-native`, not the package root.",
          },
        ]
      : []),
    ...(expoRouter
      ? [
          {
            group: ["@react-navigation/stack", "@react-navigation/bottom-tabs"],
            message: "Use expo-router's `Stack` / `NativeTabs` instead of a raw react-navigation navigator.",
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
    // modules — one rule namespace each, and the only top-level toggles
    unistyles: detect(options.unistyles, ["react-native-unistyles"]),
    legendList: detect(options.legendList, ["@legendapp/list"]),
    legendState: detect(options.legendState, ["@legendapp/state"]),
    reanimated: detect(options.reanimated, ["react-native-reanimated"]),
    turboImage: detect(options.turboImage, ["react-native-turbo-image"]),
    skia: detect(options.skia, ["@shopify/react-native-skia"]),
    keyboard: detect(options.keyboard, ["react-native-keyboard-controller"]),
    // auto-detect only: import bans and single gated rules, not modules
    gestureHandler: detect(undefined, ["react-native-gesture-handler"]),
    expoRouter: detect(undefined, ["expo-router"]),
    expoFont: detect(undefined, ["expo-font"]),
    quickCrypto: detect(undefined, ["react-native-quick-crypto"]),
    reactCompiler: detect(undefined, [
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
      ...(groups.reanimated ? [ownPlugin("react-native/rules/reanimated.js")] : []),
      ...(groups.turboImage ? [ownPlugin("react-native/rules/turbo-image.js")] : []),
      ...(groups.skia ? [ownPlugin("react-native/rules/skia.js")] : []),
      ...(groups.keyboard ? [ownPlugin("react-native/rules/keyboard.js")] : []),
    ],
    globals: { __DEV__: "readonly" },
    rules: {
      // noop handlers exemption is web-only; RN goes back to strict
      "eslint/no-empty": "error",
      "eslint/no-empty-function": "error",
      // fires on every RN gesture/animation effect; the pattern is idiomatic there
      "react-effect/no-event-handler": "off",
      "no-restricted-imports": ["error", restrictedImports(groups)],
      "@ashstack/core/no-dynamic-import": "error",
      // generic RN — always on
      "@ashstack/react-native/no-keyboard-will-events": "error",
      "@ashstack/react-native/no-scroll-position-state": "error",
      "@ashstack/react-native/no-conditional-style-array": "error",
      "@ashstack/react-native/no-leaked-render": "error",
      "@ashstack/react-native/no-rn-image-network-source": "error",
      "@ashstack/react-native/no-redundant-view-nesting": "error",
      "@ashstack/react-native/no-rn-namespace-import": "error",
      "@ashstack/react-native/no-unlabeled-icon-pressable": "error",
      "@ashstack/react-native/hoist-stateless-function": "error",
      ...(groups.reactCompiler && { "@ashstack/react-native/no-manual-memo": "error" }),
      ...(groups.reanimated && {
        "@ashstack/reanimated/animated-reaction-safety": "error",
        "@ashstack/reanimated/animated-style-needs-animated-component": "error",
        "@ashstack/reanimated/animated-updater-purity": "error",
        "@ashstack/reanimated/gpu-properties-only": "error",
        "@ashstack/reanimated/hoist-layout-animation-builder": "error",
        "@ashstack/reanimated/interpolate-needs-clamp": "error",
        "@ashstack/reanimated/no-shared-value-dot-value": "error",
        "@ashstack/reanimated/no-react-state-from-continuous-worklet": "error",
        "@ashstack/reanimated/prefer-lazy-shared-value-initializer": "error",
        "@ashstack/reanimated/schedule-on-rn-scope": "error",
        "@ashstack/reanimated/shared-value-usage": "error",
      }),
      ...(groups.turboImage && {
        "@ashstack/turbo-image/require-resize": "error",
        "@ashstack/turbo-image/require-cache-policy": "error",
      }),
      ...(groups.skia && { "@ashstack/skia/performance": "error" }),
      ...(groups.keyboard && { "@ashstack/keyboard/avoiding-view-source": "error" }),
      ...(groups.unistyles && {
        "@ashstack/unistyles/in-sheet": "error",
        "@ashstack/unistyles/insets": "error",
        "@ashstack/unistyles/content-container": "error",
        "@ashstack/unistyles/rtl-style-call": "error",
        "@ashstack/unistyles/theme-style-attr": "error",
        "@ashstack/unistyles/theme-screen-component": "error",
        "@ashstack/unistyles/animated-theme": "error",
        "@ashstack/unistyles/no-margin": "error",
        "@ashstack/unistyles/no-hardcoded-color": "error",
        "@ashstack/unistyles/no-hardcoded-spacing": "error",
        "@ashstack/unistyles/no-unused-styles": "error",
        "@ashstack/unistyles/no-style-spread": "error",
      }),
      ...(groups.legendList && {
        "@ashstack/legend-list/required-props": "error",
        "@ashstack/legend-list/no-index-key-extractor": "error",
        "@ashstack/legend-list/no-remount-key": "error",
        "@ashstack/legend-list/no-inline-data": "error",
        "@ashstack/legend-list/no-inline-extra-data": "error",
        "@ashstack/legend-list/no-inline-render-item-props": "error",
        "@ashstack/legend-list/no-mixed-children": "error",
        "@ashstack/legend-list/no-flex-in-content-container": "error",
        "@ashstack/legend-list/typed-items-need-item-type": "error",
        "@ashstack/legend-list/no-scrollview-map": "error",
        "@ashstack/legend-list/no-unsupported-props": "error",
      }),
      ...(groups.legendState && {
        "@ashstack/legend-state/no-assignment": "error",
        "@ashstack/legend-state/naming": "error",
        "@ashstack/legend-state/no-nested-observable": "error",
        "@ashstack/legend-state/no-react-mirror": "error",
        "@ashstack/legend-state/no-untracked-get-in-jsx": "error",
        "@ashstack/legend-state/no-peek-in-selector": "error",
        "@ashstack/legend-state/no-object-selector": "error",
        "@ashstack/legend-state/no-observable-in-component": "error",
      }),
    },
    ignorePatterns: ["**/.expo/**", "**/android/**", "**/ios/**"],
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/__tests__/**"],
        rules: {
          "@ashstack/core/no-dynamic-import": "off",
          "@ashstack/react-native/hoist-stateless-function": "off",
        },
      },
    ],
  });
};

export default reactNative;
