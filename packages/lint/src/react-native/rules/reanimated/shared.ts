// Helpers two or more Reanimated rules need. Anything a single rule uses lives
// in that rule's own file.
import type { AstNode, RuleContext } from "../../../lib/types.js";

/** oxlint's context, narrowed to the source text the `gate` helper reads. */
export type GateContext = RuleContext & { sourceCode?: { text?: string } };

/** Calls that hand back a SharedValue. */
const PRODUCERS = new Set([
  "useSharedValue",
  "useDerivedValue",
  "useScrollOffset",
  "useScrollViewOffset",
  "makeMutable",
]);

/** `useSharedValue(...)` and friends — decides which locals hold a shared value. */
export const isProducerCall = (node: AstNode | null | undefined): boolean => {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee as AstNode | undefined;
  return callee?.type === "Identifier" && PRODUCERS.has(callee.name as string);
};

/** The hooks whose callback is an animated updater. */
export const ANIMATED_STYLE_HOOKS = new Set(["useAnimatedStyle", "useAnimatedProps"]);
