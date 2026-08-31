import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { attributeNamed, hasSpread, isListElement, LIST, type GateContext } from "./shared.js";

export const requiredProps: Rule = problem(
  "Require `keyExtractor` and an explicit `recycleItems` on a Legend List. Without a key extractor the list keys its rows by index.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node) || hasSpread(node)) return;

        if (!attributeNamed(node, "keyExtractor")) {
          context.report({
            node: node.openingElement as AstNode,
            message:
              "Add `keyExtractor={item => item.id}` returning a stable per-item identity. The index fallback pins cached measurements and recycled row state to a position, so a prepend leaves rows showing the previous row's data.",
          });
        }

        if (!attributeNamed(node, "recycleItems")) {
          context.report({
            node: node.openingElement as AstNode,
            message:
              "Add `recycleItems={true}` — recycling is where most of the list's native speed comes from. If a row genuinely cannot be recycled, pass `recycleItems={false}` and state which part of the row required it.",
          });
        }
      },
    }),
  }
);
