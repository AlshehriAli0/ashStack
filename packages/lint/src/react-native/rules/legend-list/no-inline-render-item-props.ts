import { attributeName, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { literalKind } from "./shared.js";

const INLINE_FUNCTION =
  "Pass the handler itself with `item` or its id (`onSelect={select}`) and build this callback inside the row — a fresh function each render blocks row skipping.";

const messageFor = (expression: AstNode): string | null => {
  if (isFunction(expression)) return INLINE_FUNCTION;
  const kind = literalKind(expression);
  if (kind === null) return null;
  return `Pass \`item\` or its primitive fields and build this ${kind} inside the row, or hoist it to module scope when static — a fresh ${kind} each render blocks row skipping.`;
};

export const noInlineRenderItemProps: Rule = problem(
  "Disallow inline object literals, array literals and functions on props nested inside `renderItem`. A row whose props take a new identity every render can never be skipped.",
  {
    createOnce(context) {
      let depth = 0;
      return {
        before() {
          depth = 0;
          return gate(context, "renderItem");
        },
        JSXAttribute(node) {
          if (attributeName(node) === "renderItem") {
            depth++;
            return;
          }
          if (depth === 0) return;

          const { value } = node;
          if (value?.type !== "JSXExpressionContainer") return;
          const message = messageFor(value.expression);
          if (message !== null) context.report({ node: value, message });
        },
        "JSXAttribute:exit"(node) {
          if (attributeName(node) === "renderItem") depth--;
        },
      };
    },
  }
);
