import { problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Move the condition into a Unistyles dynamic style function: `card: (active: boolean) => ({ ... })`, then `style={styles.card(active)}`. A conditional entry can evaluate to a falsy hole, which shifts the array indices and breaks the Unistyles C++ proxy.";

export const noConditionalStyleArray: Rule = problem(
  "Bans conditional and logical entries inside a JSX `style` array. A falsy entry leaves a hole that breaks the Unistyles C++ proxy.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;
          const { value } = node;
          if (value?.type !== "JSXExpressionContainer") return;
          const array = value.expression;
          if (array.type !== "ArrayExpression") return;
          for (const element of array.elements) {
            if (element?.type !== "ConditionalExpression" && element?.type !== "LogicalExpression") continue;
            context.report({ node: element, message: MESSAGE });
          }
        },
      };
    },
  }
);
