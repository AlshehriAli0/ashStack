type OxlintConfig = Record<string, unknown>;

/**
 * Per-library rule groups. `undefined` (default) = auto-detect: the group is
 * enabled iff the consumer's package.json (walking up from cwd, so monorepos
 * work) depends on that library. `true`/`false` forces it either way.
 */
export interface CoreOptions {
  /** @ashstack/zod/ rules — detected from `zod` */
  zod?: boolean;
}

export interface ReactOptions extends CoreOptions {
  /** @ashstack/query/ rules — detected from `@tanstack/react-query` */
  query?: boolean;
  /** @ashstack/zustand/ rules — detected from `zustand` */
  zustand?: boolean;
  /** @ashstack/i18n/ rules — detected from i18next/lingui/react-intl/use-intl/next-intl/expo-localization */
  i18n?: boolean;
}

/**
 * Every toggle is a rule MODULE — one rule namespace each. Import bans and
 * single gated rules (gesture-handler/router/font/crypto bans, the React
 * Compiler gate on @ashstack/react-native/no-manual-memo) are auto-detect only — disagree with
 * one rule? Turn that rule off by name in your `rules` block.
 */
export interface ReactNativeOptions extends ReactOptions {
  /** @ashstack/unistyles/ rules + StyleSheet/Dimensions/SafeArea import bans — `react-native-unistyles` */
  unistyles?: boolean;
  /** @ashstack/legend-list/ rules + FlatList/FlashList bans — `@legendapp/list` */
  legendList?: boolean;
  /** @ashstack/legend-state/ rules + use$/useSelector ban — `@legendapp/state` */
  legendState?: boolean;
  /** @ashstack/reanimated/ rules + Animated/runOnJS bans — `react-native-reanimated` */
  reanimated?: boolean;
  /** @ashstack/turbo-image/ rules — `react-native-turbo-image` */
  turboImage?: boolean;
  /** @ashstack/skia/ rules — `@shopify/react-native-skia` */
  skia?: boolean;
  /** @ashstack/keyboard/ rules — `react-native-keyboard-controller` */
  keyboard?: boolean;
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
 *   extends: [reactNative()],
 *   rules: { "@ashstack/unistyles/no-margin": "off" },
 * });
 * ```
 */
export declare const reactNative: (options?: ReactNativeOptions) => OxlintConfig;
