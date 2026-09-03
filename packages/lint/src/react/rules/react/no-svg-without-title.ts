import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { childNames, namedBy, NAMING_ATTRIBUTES } from "./shared.js";

const DECORATIVE_ROLES = new Set(["presentation", "none"]);

const NO_SVG_NAME =
  'Give this `<svg>` a `<title>` child with content, or an `aria-label`. If it carries no meaning of its own, mark it `aria-hidden="true"`.';

/** `aria-hidden`, `aria-hidden="true"` and `aria-hidden={x}` all hide it; only an explicit false does not. */
const hidesItself = (value: AstNode | null | undefined): boolean => {
  if (value?.type === "Literal") return value.value !== "false";
  if (value?.type !== "JSXExpressionContainer") return true;
  const { expression } = value;
  return !(expression.type === "Literal" && (expression.value === false || expression.value === "false"));
};

const isDecorativeRole = (value: AstNode | null | undefined): boolean =>
  value?.type === "Literal" && typeof value.value === "string" && DECORATIVE_ROLES.has(value.value);

const marksItNamed = (attribute: AstNode): boolean => {
  if (attribute.type !== "JSXAttribute") return false;
  const name = attributeName(attribute);
  if (name === "aria-hidden") return hidesItself(attribute.value);
  if (name === "role") return isDecorativeRole(attribute.value);
  return namedBy(attribute, NAMING_ATTRIBUTES);
};

export const noSvgWithoutTitle: Rule = problem(
  "Require an accessible name on an inline `<svg>`: a `<title>` child with content, an `aria-label`, or a marker that it is decorative. Every child counts, and a self-closing `<svg />` reports.",
  {
    createOnce(context: RuleContext) {
      /** A `<title>` child, once it holds text, a real expression, or an element of its own. */
      const isTitleWithContent = (child: AstNode): boolean => {
        if (child.type !== "JSXElement") return false;
        const { name } = child.openingElement;
        if (name.type !== "JSXIdentifier" || name.name !== "title") return false;
        return child.children.some(
          held => childNames(held, context) || held.type === "JSXElement" || held.type === "JSXFragment"
        );
      };

      return {
        before() {
          return gate(context, "<svg");
        },
        JSXElement(node) {
          const opening = node.openingElement;
          if (opening.name.type !== "JSXIdentifier" || opening.name.name !== "svg") return;
          if (opening.attributes.some(marksItNamed)) return;
          if (node.children.some(isTitleWithContent)) return;

          context.report({ node: opening.name, message: NO_SVG_NAME });
        },
      };
    },
  }
);
