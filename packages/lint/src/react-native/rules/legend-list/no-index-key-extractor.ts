import { attributeName, gate, isFunction, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { expressionOf, type GateContext } from "./shared.js";

export const noIndexKeyExtractor: Rule = problem(
  "Disallow a `keyExtractor` that uses its index parameter. Cached sizes and recycled row state hang off the key, so a prepend points every measurement at the wrong item.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, "keyExtractor"),
      JSXAttribute(node) {
        if (attributeName(node) !== "keyExtractor") return;

        const fn = expressionOf(node);
        if (!isFunction(fn)) return;

        const indexParam = ((fn?.params as AstNode[] | undefined) ?? [])[1];
        if (indexParam?.type !== "Identifier") return;
        if (!subtreeHas(fn?.body, current => current.type === "Identifier" && current.name === indexParam.name)) {
          return;
        }

        context.report({
          node: fn as AstNode,
          message:
            "Return a stable per-item id from this `keyExtractor` instead of the index. Legend List hangs cached sizes and recycled row state off the key, so one prepend re-points every measurement at the wrong item.",
        });
      },
    }),
  }
);
