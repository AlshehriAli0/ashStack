import { attributeName, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { expressionOf, isListElement } from "./shared.js";

export const noIndexKeyExtractor: Rule = problem(
  "Disallow a `keyExtractor` that uses its index parameter. Cached sizes and recycled row state hang off the key, so a prepend points every measurement at the wrong item.",
  {
    createOnce: context => ({
      before: () => gate(context, "keyExtractor"),
      JSXAttribute(node) {
        if (attributeName(node) !== "keyExtractor") return;
        if (!isListElement(node.parent.parent)) return;

        const fn = expressionOf(node);
        if (fn?.type !== "ArrowFunctionExpression" && fn?.type !== "FunctionExpression") return;

        const indexParam = fn.params[1];
        if (indexParam?.type !== "Identifier") return;
        if (!subtreeHas(fn.body, current => current.type === "Identifier" && current.name === indexParam.name)) {
          return;
        }

        context.report({
          node: fn,
          message:
            "Return a stable per-item id from this `keyExtractor` instead of the index — Legend List hangs cached sizes and recycled row state off the key.",
        });
      },
    }),
  }
);
