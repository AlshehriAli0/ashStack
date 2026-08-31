import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { asNode } from "./shared.js";

const BOOLEAN_OPERATORS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

const MESSAGE =
  'Compare explicitly (`list.length > 0 &&`), coerce with `!!`, or use a ternary ending in `null`. A falsy left operand leaks into the tree: `0` renders a bare zero, which crashes React Native with "Text strings must be rendered within a <Text> component".';

const isDefinitelyBoolean = (node: AstNode | undefined): boolean => {
  if (!node) return false;
  if (node.type === "UnaryExpression" && node.operator === "!") return true;
  if (node.type === "BinaryExpression") return BOOLEAN_OPERATORS.has(node.operator as string);
  if (node.type === "Literal") return typeof node.value === "boolean";
  const callee = asNode(node.callee);
  if (node.type === "CallExpression" && callee?.type === "Identifier" && callee.name === "Boolean") return true;
  if (node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||")) {
    return isDefinitelyBoolean(asNode(node.left)) && isDefinitelyBoolean(asNode(node.right));
  }
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression") {
    return isDefinitelyBoolean(asNode(node.expression));
  }
  return false;
};

const isLengthGuard = (node: AstNode | undefined): boolean => {
  if (node?.type === "MemberExpression") return asNode(node.property)?.name === "length";
  if (node?.type === "LogicalExpression" && node.operator === "&&") return isLengthGuard(asNode(node.right));
  return false;
};

export const noLeakedRender: Rule = problem(
  'Bans a `&&` guard on a `.length` expression in JSX. The falsy left operand leaks into the output, and a bare `0` crashes React Native with "Text strings must be rendered within a <Text> component".',
  {
    createOnce(context: RuleContext) {
      return {
        JSXExpressionContainer(node) {
          const parentType = node.parent?.type;
          if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;
          const expression = asNode(node.expression);
          if (expression?.type !== "LogicalExpression" || expression.operator !== "&&") return;
          if (!isLengthGuard(asNode(expression.left))) return;
          if (isDefinitelyBoolean(asNode(expression.left))) return;
          context.report({ node: expression, message: MESSAGE });
        },
      };
    },
  }
);
