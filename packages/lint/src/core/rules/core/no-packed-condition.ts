import { gate } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const COMPARISON = new Set(["===", "!==", "==", "!=", "<", "<=", ">", ">=", "in", "instanceof"]);

const DEFAULT_MAX = 5;

/**
 * How many decisions a reader has to hold at once. Boolean operators and
 * comparisons each count one; a call, a member chain or an `as` counts as the
 * single term it reads as, so the walk stops there rather than descending.
 */
const packed = (node: AstNode | null | undefined): number => {
  if (!node) return 0;
  if (node.type === "LogicalExpression") return 1 + packed(node.left) + packed(node.right);
  if (node.type === "BinaryExpression") {
    return (COMPARISON.has(node.operator) ? 1 : 0) + packed(node.left) + packed(node.right);
  }
  if (node.type === "UnaryExpression") return node.operator === "!" ? packed(node.argument) : 0;
  if (node.type === "ConditionalExpression") {
    return 1 + packed(node.test) + packed(node.consequent) + packed(node.alternate);
  }
  return 0;
};

export const noPackedCondition: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a condition to be split into named booleans once it holds too many boolean operators and comparisons. The option says how many, defaulting to 5.",
    },
    schema: [{ type: "integer", minimum: 1 }],
  },
  createOnce(context: RuleContext) {
    let max = DEFAULT_MAX;

    const check = (test: AstNode | null | undefined): void => {
      if (!test) return;
      const count = packed(test);
      if (count <= max) return;
      context.report({
        node: test,
        message: `This condition holds ${count} boolean operators and comparisons, past the ${max} a reader takes in at once. Extract each part into an explaining variable, named so it reads on its own, like \`hasValue\` or \`priceChanged\`. Stop when the condition is just those names joined by \`&&\`/\`||\`.`,
      });
    };

    return {
      /** No condition reaches five terms without one of these, short of a contrived chain of bare comparisons. */
      before() {
        max = typeof context.options[0] === "number" ? context.options[0] : DEFAULT_MAX;
        return gate(context, "&&", "||", "??");
      },
      IfStatement(node) {
        check(node.test);
      },
      ConditionalExpression(node) {
        check(node.test);
      },
      WhileStatement(node) {
        check(node.test);
      },
      DoWhileStatement(node) {
        check(node.test);
      },
      ForStatement(node) {
        check(node.test);
      },
    };
  },
};
