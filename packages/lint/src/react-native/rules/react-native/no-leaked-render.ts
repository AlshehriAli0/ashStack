import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  'Compare explicitly (`list.length > 0 &&`), coerce with `!!`, or use a ternary ending in `null`. A falsy left operand leaks into the tree: `0` renders a bare zero, which crashes React Native with "Text strings must be rendered within a <Text> component".';

const isLengthGuard = (node: AstNode | undefined): boolean => {
  if (node?.type === "MemberExpression") return "name" in node.property && node.property.name === "length";
  if (node?.type === "LogicalExpression" && node.operator === "&&") return isLengthGuard(node.right);
  return false;
};

export const noLeakedRender: Rule = problem(
  'Disallow a `&&` guard on a `.length` expression in JSX. The falsy left operand leaks into the output, and a bare `0` crashes React Native with "Text strings must be rendered within a <Text> component".',
  {
    createOnce(context: RuleContext) {
      return {
        JSXExpressionContainer(node) {
          const parentType = node.parent.type;
          if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;
          const expression = node.expression;
          if (expression.type !== "LogicalExpression" || expression.operator !== "&&") return;
          if (!isLengthGuard(expression.left)) return;
          context.report({ node: expression, message: MESSAGE });
        },
      };
    },
  }
);
