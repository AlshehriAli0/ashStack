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

/**
 * Only rule MODULES are toggleable here. Finer-grained groups (Reanimated,
 * Turbo Image, Skia, keyboard, gesture-handler/router/font/crypto import bans,
 * React Compiler) are auto-detect only — disagree with one of their rules?
 * Turn that rule off by name in your `rules` block.
 */
export interface ReactNativeOptions extends ReactOptions {
  /** unistyles/ rules + StyleSheet/Dimensions/SafeArea import bans — `react-native-unistyles` */
  unistyles?: boolean;
  /** legend-list/ rules + FlatList/FlashList bans — `@legendapp/list` */
  legendList?: boolean;
  /** legend-state/ rules + use$/useSelector ban — `@legendapp/state` */
  legendState?: boolean;
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
 *   rules: { "unistyles/no-margin": "off" },
 * });
 * ```
 */
export declare const reactNative: (options?: ReactNativeOptions) => OxlintConfig;
