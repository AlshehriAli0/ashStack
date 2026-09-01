import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { asNode } from "./shared.js";

const BOOLEAN_OPERATORS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

const MESSAGE =
  'Compare explicitly (`list.length > 0 &&`), coerce with `!!`, or use a ternary ending in `null`. A falsy left operand leaks into the tree: `0` renders a bare zero, which crashes React Native with "Text strings must be rendered within a <Text> component".';

const isNegation = (node: AstNode): boolean => node.type === "UnaryExpression" && node.operator === "!";

const isBooleanCast = (node: AstNode): boolean => {
  const callee = asNode(node.callee);
  return node.type === "CallExpression" && callee?.type === "Identifier" && callee.name === "Boolean";
};

const isTypeOnlyWrapper = (node: AstNode): boolean =>
  node.type === "TSAsExpression" || node.type === "TSNonNullExpression";

const isBooleanCombination = (node: AstNode): boolean =>
  node.type === "LogicalExpression" &&
  (node.operator === "&&" || node.operator === "||") &&
  isDefinitelyBoolean(asNode(node.left)) &&
  isDefinitelyBoolean(asNode(node.right));

const isDefinitelyBoolean = (node: AstNode | undefined): boolean => {
  if (!node) return false;
  if (isTypeOnlyWrapper(node)) return isDefinitelyBoolean(asNode(node.expression));
  if (node.type === "BinaryExpression") return BOOLEAN_OPERATORS.has(node.operator as string);
  if (node.type === "Literal") return typeof node.value === "boolean";
  return isNegation(node) || isBooleanCast(node) || isBooleanCombination(node);
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
