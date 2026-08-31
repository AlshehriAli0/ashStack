type OxlintConfig = Record<string, unknown>;

/**
 * Base entry — strict TypeScript rules for any project (backend, CLI, library).
 * No react/jsx rules. Type-aware rules need `oxlint --type-aware` + the
 * `oxlint-tsgolint` peer.
 *
 * @example
 * ```ts
 * // oxlint.config.mts
 * import { core } from "@ashstack/lint";
 * import { defineConfig } from "oxlint";
 * export default defineConfig({ extends: [core] });
 * ```
 */
export declare const core: OxlintConfig;

/**
 * React (web) entry — everything in {@link core} plus react, jsx-a11y,
 * React Compiler diagnostics, you-might-not-need-an-effect, and TanStack
 * Query / naming rules.
 */
export declare const react: OxlintConfig;

/**
 * React Native / Expo entry — everything in {@link react} plus the `rn/`,
 * `unistyles/`, `legend-list/`, `state/` custom rule domains and the stack's
 * import bans. Your `rules` block always overrides:
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   extends: [reactNative],
 *   rules: { "unistyles/no-margin": "off" },
 * });
 * ```
 */
export declare const reactNative: OxlintConfig;
