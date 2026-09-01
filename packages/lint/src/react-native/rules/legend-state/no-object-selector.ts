import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";

const literalKind = (node: AstNode): "object" | "array" | null => {
  if (node.type === "ObjectExpression") return "object";
  if (node.type === "ArrayExpression") return "array";
  return null;
};

export const noObjectSelector: Rule = problem(
  "A `useValue` selector that builds a new object or array returns a fresh identity every run. The component then re-renders on every store change.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, "useValue");
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "Identifier" || callee.name !== "useValue") return;

          const argument = node.arguments[0];
          if (argument?.type !== "ArrowFunctionExpression" && argument?.type !== "FunctionExpression") return;

          const { body } = argument;
          if (!body) return;
          const kind = literalKind(body);
          if (kind === null) return;

          context.report({
            node: body,
            message: `Return the primitive that decides the render from this selector, or call \`useValue\` once per field. A new ${kind} each run has a new identity, so the component re-renders on every store change.`,
          });
        },
      };
    },
  }
);
