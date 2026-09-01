import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BOOLEAN_OPERATORS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

const MESSAGE =
  'Compare explicitly (`list.length > 0 &&`), coerce with `!!`, or use a ternary ending in `null`. A falsy left operand leaks into the tree: `0` renders a bare zero, which crashes React Native with "Text strings must be rendered within a <Text> component".';

const isNegation = (node: AstNode): boolean => node.type === "UnaryExpression" && node.operator === "!";

const isBooleanCast = (node: AstNode): boolean =>
  node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "Boolean";

type TypeOnlyWrapper = Extract<AstNode, { type: "TSAsExpression" | "TSNonNullExpression" }>;

const isTypeOnlyWrapper = (node: AstNode): node is TypeOnlyWrapper =>
  node.type === "TSAsExpression" || node.type === "TSNonNullExpression";

const isBooleanCombination = (node: AstNode): boolean =>
  node.type === "LogicalExpression" &&
  (node.operator === "&&" || node.operator === "||") &&
  isDefinitelyBoolean(node.left) &&
  isDefinitelyBoolean(node.right);

const isDefinitelyBoolean = (node: AstNode | undefined): boolean => {
  if (!node) return false;
  if (isTypeOnlyWrapper(node)) return isDefinitelyBoolean(node.expression);
  if (node.type === "BinaryExpression") return BOOLEAN_OPERATORS.has(node.operator);
  if (node.type === "Literal") return typeof node.value === "boolean";
  return isNegation(node) || isBooleanCast(node) || isBooleanCombination(node);
};

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
          if (isDefinitelyBoolean(expression.left)) return;
          context.report({ node: expression, message: MESSAGE });
        },
      };
    },
  }
);
