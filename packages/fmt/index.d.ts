/**
 * ashStack oxfmt defaults: 120 cols, double quotes, semicolons, es5 trailing
 * commas, `arrowParens: "avoid"`, sorted imports. oxfmt has no `extends`, so
 * spread to override:
 *
 * @example
 * ```ts
 * // oxfmt.config.mts
 * import fmt from "@ashstack/fmt";
 * export default { ...fmt, useTabs: true };
 * ```
 */
declare const config: Record<string, unknown>;
export default config;
