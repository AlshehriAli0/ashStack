import { calleeName, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const ASYNC_FOR = new Map([
  ["runOnUISync", "runOnUIAsync"],
  ["runOnRuntimeSync", "runOnRuntimeAsync"],
  ["runOnRuntimeSyncWithId", "runOnRuntimeAsyncWithId"],
]);

export const noSyncRuntimeCall: Rule = problem(
  "Disallow `runOnUISync` and `runOnRuntimeSync`. They block the calling thread until the worklet finishes; `runOnUIAsync` and `runOnRuntimeAsync` return the same value as a promise.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "Sync");
        },
        CallExpression(node) {
          const name = calleeName(node);
          const replacement = ASYNC_FOR.get(name);
          if (replacement === undefined) return;
          context.report({
            node: node.callee,
            message: `Call \`${replacement}\` and await the result. \`${name}\` blocks the calling thread until the worklet finishes.`,
          });
        },
      };
    },
  }
);
