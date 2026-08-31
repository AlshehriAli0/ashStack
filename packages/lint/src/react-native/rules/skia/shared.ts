import type { RuleContext } from "../../../lib/types.js";

/** A rule context with the source-code text typed, for `gate`. */
export type SkiaContext = RuleContext & { sourceCode?: { text?: string } };
