import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { expressionOf, literalKind, type GateContext } from "./shared.js";

export const noInlineExtraData: Rule = problem(
  "An inline object or array as `extraData` takes a new identity on every parent render, and every mounted row re-evaluates with it.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, "extraData"),
      JSXAttribute(node) {
        if (attributeName(node) !== "extraData") return;

        const value = expressionOf(node);
        const kind = literalKind(value);
        if (kind === null) return;

        context.report({
          node: value as AstNode,
          message: `Pass the primitive that actually changed as \`extraData\`, or hoist this ${kind} when it is stable. A fresh ${kind} reference each render re-evaluates every mounted row.`,
        });
      },
    }),
  }
);
