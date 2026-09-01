import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { literalKind } from "./shared.js";

export const noInlineRenderItemProps: Rule = problem(
  "Disallow inline object and array literals on props nested inside `renderItem`. A row whose props take a new identity every render can never be skipped.",
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
          const kind = literalKind(value.expression);
          if (kind === null) return;

          context.report({
            node: value,
            message: `Pass \`item\` or its primitive fields and build this ${kind} inside the row, or hoist it to module scope when it is static. A fresh ${kind} each render means the row can never be skipped, so typing anywhere re-renders every visible row.`,
          });
        },
        "JSXAttribute:exit"(node) {
          if (attributeName(node) === "renderItem") depth--;
        },
      };
    },
  }
);
