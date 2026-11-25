import {
  crossesFunctionBefore,
  findInSubtree,
  FUNCTION_TYPES,
  gate,
  isFunction,
  isMemberCall,
  problem,
  propertyValue,
  subtreeHas,
} from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { MUTATION_OPTIONS_CALLS, optionsArgument } from "./shared.js";

const MESSAGES = {
  cancel:
    "Await `queryClient.cancelQueries({ queryKey })` before this first cache write. A refetch already in flight can otherwise land after it and silently revert the optimistic value.",
  snapshot:
    "Return the snapshot from `onMutate`: `return { previous }`. It reaches `onError` as its third argument, the only record of what to restore.",
  rollback:
    "Add an `onError` that writes the `onMutate` snapshot back. Without it a failed mutation leaves the optimistic value in the cache.",
};

const isCacheWrite = (node: AstNode): boolean =>
  isMemberCall(node, "setQueryData") || isMemberCall(node, "setQueriesData");

const awaitsCancelBefore = (onMutate: AstNode, write: AstNode): boolean =>
  subtreeHas(
    onMutate,
    node =>
      node.type === "AwaitExpression" &&
      node.end <= write.start &&
      subtreeHas(node.argument, inner => isMemberCall(inner, "cancelQueries"))
  );

/** Whether `onMutate` returns something other than a cache write's own result, which is no snapshot. */
const returnsSnapshot = (onMutate: AstNode): boolean => {
  if (onMutate.type === "ArrowFunctionExpression" && onMutate.expression) return !isCacheWrite(onMutate.body);
  return subtreeHas(
    onMutate,
    node =>
      node.type === "ReturnStatement" &&
      node.argument !== null &&
      !isCacheWrite(node.argument) &&
      !crossesFunctionBefore(node, onMutate, FUNCTION_TYPES)
  );
};

export const optimisticUpdateComplete: Rule = problem(
  "Require a mutation whose `onMutate` writes the query cache to await `cancelQueries` before the write, return a snapshot, and roll back in `onError`. Skip one and the UI looks right until the next refresh.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "onMutate");
        },
        CallExpression(node) {
          const options = optionsArgument(node, MUTATION_OPTIONS_CALLS);
          const onMutate = propertyValue(options, "onMutate");
          if (onMutate === null || !isFunction(onMutate)) return;
          const write = findInSubtree(onMutate, isCacheWrite);
          if (write === null) return;
          if (!awaitsCancelBefore(onMutate, write)) context.report({ node: write, message: MESSAGES.cancel });
          if (!returnsSnapshot(onMutate)) context.report({ node: onMutate, message: MESSAGES.snapshot });
          if (propertyValue(options, "onError") === null)
            context.report({ node: onMutate, message: MESSAGES.rollback });
        },
      };
    },
  }
);
