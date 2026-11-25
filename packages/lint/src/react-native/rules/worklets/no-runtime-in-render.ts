import { calleeName, enclosingComponentOrHook, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

export const noRuntimeInRender: Rule = problem(
  "Disallow `createWorkletRuntime` inside a component or hook. Each call starts a new JavaScript runtime and, with the default queue, a new thread; create it once at module scope and reuse it.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "createWorkletRuntime");
        },
        CallExpression(node) {
          if (calleeName(node) !== "createWorkletRuntime" || enclosingComponentOrHook(node) === null) return;
          context.report({
            node,
            message:
              "Create this runtime once at module scope and reuse it. Inside a component or hook, each `createWorkletRuntime` call starts a new JavaScript runtime and, with the default queue, a new thread.",
          });
        },
      };
    },
  }
);
