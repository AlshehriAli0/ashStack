import { gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const NO_USE_NO_MEMO =
  'Delete `"use no memo"` and fix what the compiler bails out on. The directive opts this code out of the React Compiler, so it alone stops being memoised and the bailout is hidden instead of fixed.';

export const noUseNoMemo: Rule = problem(
  'Disallow the `"use no memo"` directive. It removes a component or file from the React Compiler, which clears the bailout report without fixing it.',
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "use no memo");
        },
        ExpressionStatement(node) {
          if (node.directive === "use no memo") context.report({ node, message: NO_USE_NO_MEMO });
        },
      };
    },
  }
);
