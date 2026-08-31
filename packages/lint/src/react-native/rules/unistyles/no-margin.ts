import { subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { inCreate, propertyName } from "./shared.js";

const ANY_MARGIN = /^margin(?:$|Top$|Bottom$|Left$|Right$|Start$|End$|Horizontal$|Vertical$)/;

const isNegation = (current: AstNode): boolean =>
  (current.type === "UnaryExpression" && current.operator === "-") ||
  (current.type === "Literal" && typeof current.value === "number" && current.value < 0);

const MESSAGE =
  "Use `gap` on the parent or `padding` on this element instead of `margin`. Margin escapes the child's own box, so it leaves stray space behind when the first or last child is removed; negative margins stay allowed for overlap and half-size centering.";

export const noMargin: Rule = inCreate(
  "Disallow non-negative `margin` inside `StyleSheet.create`; `gap` on the parent or `padding` on the element spaces children without leaving a hole when one is removed.",
  (context, inside) => ({
    Property(node) {
      if (!inside()) return;
      const name = propertyName(node);
      if (name === "" || !ANY_MARGIN.test(name)) return;
      if (subtreeHas(node.value, isNegation)) return;
      context.report({ node, message: MESSAGE });
    },
  })
);
