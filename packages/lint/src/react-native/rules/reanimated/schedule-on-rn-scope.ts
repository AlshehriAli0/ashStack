import { calleeName, gate, isFunction, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const INLINE_CALLBACK =
  "Pass a function declared in RN Runtime scope to `scheduleOnRN`; an inline callback can be created on the wrong runtime.";

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
          const [callback] = node.arguments;
          if (callback === undefined) return;
          if (isFunction(callback) && callback.type !== "FunctionDeclaration") {
            context.report({ node: callback, message: INLINE_CALLBACK });
          }
        },
      };
    },
  }
);
