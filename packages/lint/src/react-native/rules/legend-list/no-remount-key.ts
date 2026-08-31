import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { attributeNamed, isListElement, LIST, type GateContext } from "./shared.js";

export const noRemountKey: Rule = problem(
  "Disallow `key` on a Legend List, which remounts on any key change and loses its measurements and scroll position. Pass `dataKey` instead.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        const key = attributeNamed(node, "key");
        if (!key) return;

        context.report({
          node: key,
          message:
            "Pass `dataKey` instead of `key` here: it re-initialises the list for a different dataset from the inside, without the remount that discards every measurement, cached size and scroll position.",
        });
      },
    }),
  }
);
