import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { attributesOf, isListElement, LIST } from "./shared.js";

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
    createOnce: context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;

        for (const attribute of attributesOf(node)) {
          if (attribute.type !== "JSXAttribute") continue;
          if (!UNSUPPORTED_PROPS.has(attributeName(attribute))) continue;

          context.report({
            node: attribute,
            message:
              "Remove this prop — Legend List v3 ignores it silently. Inverted chat lists use `maintainScrollAtEnd` / `initialScrollAtEnd` / `maintainVisibleContentPosition`.",
          });
        }
      },
    }),
  }
);
