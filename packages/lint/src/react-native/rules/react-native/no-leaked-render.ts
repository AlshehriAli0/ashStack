import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Compare explicitly (`list.length > 0 &&`), coerce with `!!`, or use a ternary ending in `null` — a `0` leaks into the tree and crashes React Native.";

const COUNT_PROPERTIES = new Set(["length", "size"]);
const ARITHMETIC = new Set(["+", "-", "*", "/", "%", "**"]);

/**
 * A guard this rule can see is a number or a string, rather than one it merely
 * cannot prove is a boolean. `{isOpen && …}` stays quiet; `{count - 1 && …}`
 * does not. Only the right side of an `&&` chain decides, since that is the
 * value that reaches the tree.
 */
const leaksAValue = (node: AstNode | undefined): boolean => {
  if (node === undefined) return false;
  if (node.type === "MemberExpression") {
    return node.property.type === "Identifier" && COUNT_PROPERTIES.has(node.property.name);
  }
  if (node.type === "Literal") return typeof node.value === "number" || typeof node.value === "string";
  if (node.type === "BinaryExpression") return ARITHMETIC.has(node.operator);
  if (node.type === "TemplateLiteral") return true;
  if (node.type === "LogicalExpression" && node.operator === "&&") return leaksAValue(node.right);
  return false;
};

export const noLeakedRender: Rule = problem(
  'Disallow a `&&` guard in JSX on a value this rule can see is a number or a string — a `.length`, a `.size`, arithmetic, a literal. The falsy left operand leaks into the output, and a bare `0` crashes React Native with "Text strings must be rendered within a <Text> component".',
  {
    createOnce(context: RuleContext) {
      return {
        JSXExpressionContainer(node) {
          const parentType = node.parent.type;
          if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;
          const expression = node.expression;
          if (expression.type !== "LogicalExpression" || expression.operator !== "&&") return;
          if (!leaksAValue(expression.left)) return;
          context.report({ node: expression, message: MESSAGE });
        },
      };
    },
  }
);
