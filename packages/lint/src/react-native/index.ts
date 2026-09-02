import { TEST_FILES } from "../core/index.js";
import { effectPlugin } from "../lib/effect-plugin.js";
import { mergeConfigs } from "../lib/merge.js";
import { composeModules } from "../lib/module.js";
import { coreRegistry, reactNativeRegistry, reactRegistry } from "../lib/registry.js";
import type { BanGroup, OxlintConfig, ReactNativeOptions } from "../lib/types.js";
import react from "../react/index.js";

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

const FORBID_EMPTY_NOOP_HANDLERS = {
  "eslint/no-empty": "error",
  "eslint/no-empty-function": "error",
} as const;

const ALLOW_GESTURE_AND_ANIMATION_EFFECTS = {
  "react-effect/no-event-handler": "off",
} as const;

/**
 * React Native / Expo entry — everything in react plus generic RN rules, with
 * per-library modules (unistyles, legendList, legendState, reanimated,
 * turboImage, skia, keyboard) auto-detected from your dependencies. Your
 * `rules` block always overrides.
 */
const reactNative = (options: ReactNativeOptions = {}): OxlintConfig => {
  const composed = composeModules([...coreRegistry, ...reactRegistry, ...reactNativeRegistry], options, banGroups);

  return mergeConfigs(react(options), {
    jsPlugins: composed.jsPlugins,
    globals: { __DEV__: "readonly" },
    rules: {
      ...FORBID_EMPTY_NOOP_HANDLERS,
      ...(effectPlugin().present ? ALLOW_GESTURE_AND_ANIMATION_EFFECTS : {}),
      "no-restricted-imports": ["error", composed.restricted],
      ...composed.rules,
    },
    ignorePatterns: ["**/.expo/**", "**/android/**", "**/ios/**"],
    overrides: [
      {
        files: TEST_FILES,
        rules: {
          "@ashstack/react-native/no-dynamic-import": "off",
          "@ashstack/react-native/hoist-stateless-function": "off",
        },
      },
    ],
  });
};

export { reactNative };
export type { ReactNativeOptions, ModuleManifest } from "../lib/types.js";

export default reactNative;
