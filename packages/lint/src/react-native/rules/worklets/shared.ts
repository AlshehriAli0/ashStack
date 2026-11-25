import { calleeName } from "../../../lib/ast.js";
import type { AstNode } from "../../../lib/types.js";

/** Scheduling call to the index of the worklet it takes: the runtime, when there is one, comes first. */
const WORKLET_ARGUMENT = new Map([
  ["scheduleOnUI", 0],
  ["runOnUIAsync", 0],
  ["runOnUISync", 0],
  ["scheduleOnRuntime", 1],
  ["runOnRuntimeAsync", 1],
  ["runOnRuntimeSync", 1],
  ["scheduleOnRuntimeWithId", 1],
  ["runOnRuntimeAsyncWithId", 1],
  ["runOnRuntimeSyncWithId", 1],
]);

/** The argument a scheduling call runs on the other runtime, which the worklets Babel plugin workletizes. */
export const workletArgument = (call: Extract<AstNode, { type: "CallExpression" }>): AstNode | undefined => {
  const index = WORKLET_ARGUMENT.get(calleeName(call));
  return index === undefined ? undefined : call.arguments[index];
};

/** Whether `node` is a function that runs as a worklet: it opens with the directive, or it is a scheduling call's worklet. */
export const isWorklet = (node: AstNode): boolean => {
  if (
    node.type !== "FunctionDeclaration" &&
    node.type !== "FunctionExpression" &&
    node.type !== "ArrowFunctionExpression"
  ) {
    return false;
  }
  const first = node.body?.type === "BlockStatement" ? node.body.body[0] : undefined;
  if (first?.type === "ExpressionStatement" && first.directive === "worklet") return true;
  return node.parent.type === "CallExpression" && workletArgument(node.parent) === node;
};
