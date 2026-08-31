type OxlintConfig = Record<string, unknown>;

/**
 * Per-library rule groups. `undefined` (default) = auto-detect: the group is
 * enabled iff the consumer's package.json (walking up from cwd, so monorepos
 * work) depends on that library. `true`/`false` forces it either way.
 */
export interface CoreOptions {
  /** zod/ rules — detected from `zod` */
  zod?: boolean;
}

export interface ReactOptions extends CoreOptions {
  /** query/ rules — detected from `@tanstack/react-query` */
  query?: boolean;
  /** zustand/ rules — detected from `zustand` */
  zustand?: boolean;
  /** i18n/ rules — detected from i18next/lingui/react-intl/use-intl/next-intl/expo-localization */
  i18n?: boolean;
}

export interface ReactNativeOptions extends ReactOptions {
  /** unistyles/ rules + StyleSheet/Dimensions/SafeArea import bans — `react-native-unistyles` */
  unistyles?: boolean;
  /** legend-list/ rules + FlatList/FlashList bans — `@legendapp/list` */
  legendList?: boolean;
  /** legend-state/ rules + use$/useSelector ban — `@legendapp/state` */
  legendState?: boolean;
  /** Reanimated/worklets rn/ rules + Animated/runOnJS bans — `react-native-reanimated` */
  reanimated?: boolean;
  /** rn/require-turbo-image-* — `react-native-turbo-image` */
  turboImage?: boolean;
  /** rn/skia-performance — `@shopify/react-native-skia` */
  skia?: boolean;
  /** rn/keyboard-avoiding-view-source — `react-native-keyboard-controller` */
  keyboard?: boolean;
  /** RN Pressable/Touchable* ban — `react-native-gesture-handler` */
  gestureHandler?: boolean;
  /** react-navigation navigator bans — `expo-router` */
  expoRouter?: boolean;
  /** runtime font-loading ban — `expo-font` */
  expoFont?: boolean;
  /** crypto-js ban — `react-native-quick-crypto` */
  quickCrypto?: boolean;
  /** rn/no-manual-memo (only correct with the compiler) — `babel-plugin-react-compiler` */
  reactCompiler?: boolean;
}

/**
 * Base entry — strict TypeScript rules for any project (backend, CLI, library).
 * Type-aware rules need `oxlint --type-aware` + the `oxlint-tsgolint` peer.
 *
 * @example
 * ```ts
 * // oxlint.config.mts
 * import { core } from "@ashstack/lint";
 * import { defineConfig } from "oxlint";
 * export default defineConfig({ extends: [core()] });
 * ```
 */
export declare const core: (options?: CoreOptions) => OxlintConfig;

/**
 * React (web) entry — everything in {@link core} plus react, jsx-a11y,
 * React Compiler diagnostics, you-might-not-need-an-effect, and auto-detected
 * library rules (query, zustand, i18n).
 */
export declare const react: (options?: ReactOptions) => OxlintConfig;

/**
 * React Native / Expo entry — everything in {@link react} plus generic RN rules,
 * with per-library groups auto-detected from your dependencies. Your `rules`
 * block always overrides:
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   extends: [reactNative({ skia: false })],
 *   rules: { "unistyles/no-margin": "off" },
 * });
 * ```
 */
export declare const reactNative: (options?: ReactNativeOptions) => OxlintConfig;
