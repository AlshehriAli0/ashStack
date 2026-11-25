import { calleeName, gate, isFunction, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";
import { enclosingFunction, WORKLET_ARGUMENT } from "./shared.js";

export const noInlineWorkletSchedule: Rule = problem(
  "Disallow an inline function as the worklet of `scheduleOnUI`, `scheduleOnRuntime`, `runOnUIAsync`, `runOnUISync`, `runOnRuntimeAsync` or `runOnRuntimeSync` inside a function. The serialized copy is cached by function identity, so a new function object is serialized again on every call. Module scope runs once and is allowed.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "OnUI", "OnRuntime");
        },
        CallExpression(node) {
          const name = calleeName(node);
          const index = WORKLET_ARGUMENT.get(name);
          if (index === undefined) return;
          const worklet = node.arguments[index];
          if (worklet === undefined || !isFunction(worklet) || enclosingFunction(node) === null) return;
          context.report({
            node: worklet,
            message: `Define this worklet once, outside the call, and pass what it needs as arguments: \`${name}(${index === 1 ? "runtime, " : ""}work, a, b)\`. A new function object here is serialized on every call.`,
          });
        },
      };
    },
  }
);
