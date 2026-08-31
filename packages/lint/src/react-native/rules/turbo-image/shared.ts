import type { RuleContext } from "../../../lib/types.js";

/** A rule context with the source-code text typed, for `gate`. */
export type TurboImageContext = RuleContext & { sourceCode?: { text?: string } };
