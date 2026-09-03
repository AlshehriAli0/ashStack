import { TEST_FILES } from "../core/index.js";
import { mergeConfigs } from "../lib/merge.js";
import { composeModules } from "../lib/module.js";
import { coreRegistry, reactNativeRegistry, reactRegistry } from "../lib/registry.js";
import type { BanGroup, OxlintConfig, ReactNativeOptions, RuleMap } from "../lib/types.js";
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
            "Import `Pressable` from `react-native-gesture-handler`. Inside a SwiftUI/Compose host view, keep React Native's `Pressable` and suppress this rule naming the host.",
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
  "@ashstack/effects/no-event-handler": "off",
} as const;

/**
 * `no-manual-memo` asks for a `// why:` line above every `useMemo`, on the
 * grounds that the compiler already memoised it. With `reactCompiler: false`
 * that ground is gone: a hand-written memo is the only memo there is, and
 * asking a consumer to justify each one would contradict the `react-perf`
 * rules the same flag switches on.
 */
const compilerOnlyRules = (reactCompiler: boolean): RuleMap =>
  reactCompiler ? {} : { "@ashstack/react-native/no-manual-memo": "off" };

/**
 * React Native / Expo entry — everything in react plus generic RN rules, with
 * per-library modules (unistyles, legendList, legendState, reanimated,
 * turboImage, skia, keyboard) auto-detected from your dependencies. Your
 * `rules` block always overrides.
 *
 * @see [every rule `react-native()` sets](https://github.com/AlshehriAli0/ashStack/blob/main/packages/lint/RULES.md#react-native)
 */
const reactNative = (options: ReactNativeOptions = {}): OxlintConfig => {
  const composed = composeModules([...coreRegistry, ...reactRegistry, ...reactNativeRegistry], options, banGroups);

  return mergeConfigs(react(options), {
    jsPlugins: composed.jsPlugins,
    globals: { __DEV__: "readonly" },
    rules: {
      ...FORBID_EMPTY_NOOP_HANDLERS,
      ...ALLOW_GESTURE_AND_ANIMATION_EFFECTS,
      "no-restricted-imports": ["error", composed.restricted],
      ...composed.rules,
      ...compilerOnlyRules(options.reactCompiler ?? true),
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
export type { CoreRuleId } from "../lib/rule-types/core.js";
export type { ReactRuleId } from "../lib/rule-types/react.js";
export type { ReactNativeRuleId } from "../lib/rule-types/react-native.js";
export type { ReactNativeOptions, ModuleManifest } from "../lib/types.js";

export default reactNative;
