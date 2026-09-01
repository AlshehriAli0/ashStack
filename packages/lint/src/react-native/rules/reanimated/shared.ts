import { calleeName } from "../../../lib/ast.js";
import type { AstNode } from "../../../lib/types.js";

/** Calls that hand back a SharedValue. */
const PRODUCERS = new Set([
  "useSharedValue",
  "useDerivedValue",
  "useScrollOffset",
  "useScrollViewOffset",
  "makeMutable",
]);

/** `useSharedValue(...)` and friends, under a namespace or not — decides which locals hold a shared value. */
export const isProducerCall = (node: AstNode | null | undefined): boolean =>
  node?.type === "CallExpression" && PRODUCERS.has(calleeName(node));

/** The hooks whose callback is an animated updater. */
export const ANIMATED_STYLE_HOOKS = new Set(["useAnimatedStyle", "useAnimatedProps"]);
