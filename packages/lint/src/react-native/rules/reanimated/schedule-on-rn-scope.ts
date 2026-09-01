import { calleeName, FUNCTION_TYPES, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const INLINE_CALLBACK =
  "Pass a function declared in RN Runtime scope to `scheduleOnRN`; an inline callback has ambiguous runtime ownership and can be created on the wrong runtime.";

/** Report every function expression in the subtree; the walk never short-circuits. */
const collectFunctions = (node: unknown, report: (found: AstNode) => void): void => {
  subtreeHas(node, current => {
    if (FUNCTION_TYPES.has(current.type) && current.type !== "FunctionDeclaration") report(current);
    return false;
  });
};

export const scheduleOnRnScope: Rule = problem(
  "`scheduleOnRN` takes a function declared in RN Runtime scope. An inline callback can end up created on the wrong runtime.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "scheduleOnRN");
        },
        CallExpression(node) {
          if (calleeName(node) !== "scheduleOnRN") return;
          for (const argument of node.arguments) {
            collectFunctions(argument, found => {
              context.report({ node: found, message: INLINE_CALLBACK });
            });
          }
        },
      };
    },
  }
);
