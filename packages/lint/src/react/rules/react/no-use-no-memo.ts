import { gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

/** The React Compiler's opt-out directives; `"use no forget"` is the older spelling it still honours. */
const OPT_OUTS = new Set(["use no memo", "use no forget"]);

export const noUseNoMemo: Rule = problem(
  'Disallow the `"use no memo"` directive, and its older `"use no forget"` spelling. It removes a component or file from the React Compiler, which clears the bailout report without fixing it.',
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "use no ");
        },
        ExpressionStatement(node) {
          if (!OPT_OUTS.has(node.directive ?? "")) return;
          context.report({
            node,
            message: `Delete \`"${node.directive ?? ""}"\` and fix what the compiler bails out on. The directive opts this code out of the React Compiler, so it alone stops being memoised and the bailout is hidden instead of fixed.`,
          });
        },
      };
    },
  }
);
