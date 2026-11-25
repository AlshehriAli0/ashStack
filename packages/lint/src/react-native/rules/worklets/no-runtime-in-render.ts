import { ancestors, calleeName, COMPONENT_OR_HOOK, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { boundFunctionName } from "./shared.js";

const componentOrHookAround = (node: AstNode): string | null => {
  for (const current of ancestors(node)) {
    if (!isFunction(current)) continue;
    const name = boundFunctionName(current);
    if (name !== null && COMPONENT_OR_HOOK.test(name)) return name;
  }
  return null;
};

export const noRuntimeInRender: Rule = problem(
  "Disallow `createWorkletRuntime` inside a component or hook. Each call starts a new JavaScript runtime and, with the default queue, a new thread; create it once at module scope and reuse it.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "createWorkletRuntime");
        },
        CallExpression(node) {
          if (calleeName(node) !== "createWorkletRuntime") return;
          const owner = componentOrHookAround(node);
          if (owner === null) return;
          context.report({
            node,
            message: `Create this runtime once at module scope and reuse it. Inside \`${owner}\`, \`createWorkletRuntime\` starts a new JavaScript runtime and thread every time \`${owner}\` runs.`,
          });
        },
      };
    },
  }
);
