import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { expressionOf, isListElement, literalKind } from "./shared.js";

export const noInlineExtraData: Rule = problem(
  "An inline object or array as `extraData` takes a new identity on every parent render, and every mounted row re-evaluates with it.",
  {
    createOnce: context => ({
      before: () => gate(context, "extraData"),
      JSXAttribute(node) {
        if (attributeName(node) !== "extraData") return;
        if (!isListElement(node.parent.parent)) return;

        const value = expressionOf(node);
        const kind = literalKind(value);
        if (value === null || kind === null) return;

        context.report({
          node: value,
          message: `Pass the primitive that actually changed as \`extraData\`, or hoist this ${kind} when it is stable. A fresh ${kind} reference each render re-evaluates every mounted row.`,
        });
      },
    }),
  }
);
