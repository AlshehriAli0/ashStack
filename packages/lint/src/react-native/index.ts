// @ashstack/lint — react-native entry. Extends react with the RN modules; each
// module manifest carries its own rules, detection packages, and import bans,
// so this file only composes them and adds the ban-only groups.
import { mergeConfigs } from "../lib/merge.js";
import { composeModules } from "../lib/module.js";
import type { BanGroup, OxlintConfig, ReactNativeOptions } from "../lib/types.js";
import react from "../react/index.js";
import keyboardModule from "./rules/keyboard/index.js";
import legendListModule from "./rules/legend-list/index.js";
import legendStateModule from "./rules/legend-state/index.js";
import reactNativeModule from "./rules/react-native/index.js";
import reanimatedModule from "./rules/reanimated/index.js";
import skiaModule from "./rules/skia/index.js";
import turboImageModule from "./rules/turbo-image/index.js";
import unistylesModule from "./rules/unistyles/index.js";

export const reactNativeModules = [
  reactNativeModule,
  unistylesModule,
  legendListModule,
  legendStateModule,
  reanimatedModule,
  turboImageModule,
  skiaModule,
  keyboardModule,
];

// Import bans gated on a library, with no rules of their own.
export const banGroups: BanGroup[] = [
  {
    packages: ["react-native-gesture-handler"],
    restrictedImports: {
      paths: [
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
      ],
    },
  },
  {
    packages: ["expo-router"],
    restrictedImports: {
      patterns: [
        {
          group: ["@react-navigation/stack", "@react-navigation/bottom-tabs"],
          message: "Use expo-router's `Stack` / `NativeTabs` instead of a raw react-navigation navigator.",
        },
      ],
    },
  },
  {
    packages: ["expo-font"],
    restrictedImports: {
      paths: [
        {
          name: "expo-font",
          importNames: ["useFonts", "loadAsync"],
          message:
            "Declare the fonts in the `expo-font` config plugin so they load at build time, instead of `useFonts`/`loadAsync` at runtime.",
        },
      ],
    },
  },
  {
    packages: ["react-native-quick-crypto"],
    restrictedImports: {
      paths: [
        {
          name: "crypto-js",
          message:
            "Use `react-native-quick-crypto` instead — `crypto-js` is pure JavaScript and runs orders of magnitude slower.",
        },
      ],
    },
  },
];

/**
 * React Native / Expo entry — everything in react plus generic RN rules, with
 * per-library modules (unistyles, legendList, legendState, reanimated,
 * turboImage, skia, keyboard) auto-detected from your dependencies. Your
 * `rules` block always overrides.
 */
const reactNative = (options: ReactNativeOptions = {}): OxlintConfig => {
  const composed = composeModules(reactNativeModules, options as Record<string, boolean | undefined>, banGroups);

  return mergeConfigs(react(options), {
    jsPlugins: composed.jsPlugins,
    globals: { __DEV__: "readonly" },
    rules: {
      // noop handlers exemption is web-only; RN goes back to strict
      "eslint/no-empty": "error",
      "eslint/no-empty-function": "error",
      // fires on every RN gesture/animation effect; the pattern is idiomatic there
      "react-effect/no-event-handler": "off",
      "no-restricted-imports": ["error", composed.restricted],
      ...composed.rules,
    },
    ignorePatterns: ["**/.expo/**", "**/android/**", "**/ios/**"],
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/__tests__/**"],
        rules: {
          "@ashstack/react-native/no-dynamic-import": "off",
          "@ashstack/react-native/hoist-stateless-function": "off",
        },
      },
    ],
  });
};

export default reactNative;
