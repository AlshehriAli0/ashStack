import { isFunction } from "../../../lib/ast.js";
import type { AstNode } from "../../../lib/types.js";

/** Scheduling call to the index of the worklet it takes: the runtime, when there is one, comes first. */
export const WORKLET_ARGUMENT = new Map([
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

/** The function that encloses `node`, or `null` at module scope. */
export const enclosingFunction = (node: AstNode): AstNode | null => {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunction(current)) return current;
  }
  return null;
};

/** The name a function is bound to: its declaration's id, or the variable it initializes. */
export const boundFunctionName = (node: AstNode): string | null => {
  if (node.type === "FunctionDeclaration") return node.id?.name ?? null;
  const { parent } = node;
  if (parent?.type !== "VariableDeclarator" || parent.id.type !== "Identifier") return null;
  return parent.id.name;
};
