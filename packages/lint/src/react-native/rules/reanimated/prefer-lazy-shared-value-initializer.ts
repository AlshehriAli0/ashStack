import { gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const EAGER_INITIALIZER =
  "Wrap this in a lazy initializer: `useSharedValue(() => compute())`, since the eager call runs on every React render.";

export const preferLazySharedValueInitializer: Rule = problem(
  "Pass a computed `useSharedValue` initial value as a function. An eager call runs on every render while only the first result is kept.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "useSharedValue");
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "Identifier" || callee.name !== "useSharedValue") return;
          const argument = node.arguments[0];
          if (!argument) return;
          const eager =
            (argument.type === "CallExpression" && argument.callee.type === "Identifier") ||
            argument.type === "NewExpression";
          if (!eager) return;
          context.report({ node, message: EAGER_INITIALIZER });
        },
      };
    },
  }
);
