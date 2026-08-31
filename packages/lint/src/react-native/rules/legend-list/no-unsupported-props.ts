import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { attributesOf, isListElement, LIST, type GateContext } from "./shared.js";

// FlashList / FlatList props that do not exist on Legend List v3. Passing one is
// silently ignored, which reads as "the feature is broken".
const UNSUPPORTED_PROPS = new Set([
  "masonry",
  "optimizeItemArrangement",
  "inverted",
  "onBlankArea",
  "disableAutoLayout",
  "CellRendererComponent",
]);

export const noUnsupportedProps: Rule = problem(
  "Disallow FlashList and FlatList props that Legend List v3 does not have. It ignores them rather than rejecting them, so the feature looks broken.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;

        for (const attribute of attributesOf(node)) {
          if (attribute.type !== "JSXAttribute") continue;
          if (!UNSUPPORTED_PROPS.has(attributeName(attribute))) continue;

          context.report({
            node: attribute,
            message:
              "Remove this prop: Legend List v3 has no such prop and ignores it silently rather than rejecting it. Build inverted chat lists from `maintainScrollAtEnd` / `initialScrollAtEnd` / `maintainVisibleContentPosition` instead.",
          });
        }
      },
    }),
  }
);
