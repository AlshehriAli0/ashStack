import { calleeName, closestAncestor, FUNCTION_TYPES, gate, isFunction, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";
import { workletArgument } from "./shared.js";

export const noInlineWorkletSchedule: Rule = problem(
  "Disallow an inline function as the worklet of `scheduleOnUI`, `scheduleOnRuntime`, `runOnUIAsync`, `runOnUISync`, `runOnRuntimeAsync` or `runOnRuntimeSync` inside a function. The serialized copy is cached by function identity, so a new function object is serialized again on every call. Module scope runs once and is allowed.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "OnUI", "OnRuntime");
        },
        CallExpression(node) {
          const worklet = workletArgument(node);
          if (worklet === undefined || !isFunction(worklet) || closestAncestor(node, FUNCTION_TYPES) === null) return;
          context.report({
            node: worklet,
            message: `Define this worklet once, outside the call, and pass what it needs as \`${calleeName(node)}\`'s extra arguments. A new function object here is serialized on every call.`,
          });
        },
      };
    },
  }
);
