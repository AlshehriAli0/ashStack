import { attributeName, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DECORATIVE_ROLES = new Set(["presentation", "none"]);
const NAMING_ATTRIBUTES = new Set(["aria-label", "aria-labelledby"]);

const TRIVIAL_EXPRESSION = /^(?:null|undefined|false|true|""|''|``)$/;

const NO_SVG_NAME =
  'Give this `<svg>` a `<title>` child with content, or an `aria-label`, so a screen reader can name it. If it carries no meaning of its own, mark it `aria-hidden="true"` or `role="presentation"` and let the text beside it do the naming.';

/** `aria-hidden`, `aria-hidden="true"` and `aria-hidden={x}` all hide it; only an explicit false does not. */
const hidesItself = (value: AstNode | null | undefined): boolean => {
  if (value?.type === "Literal") return value.value !== "false";
  if (value?.type !== "JSXExpressionContainer") return true;
  const { expression } = value;
  return !(expression.type === "Literal" && (expression.value === false || expression.value === "false"));
};

/** An `aria-label=""` names nothing, so it has to carry content to count. */
const hasContent = (value: AstNode | null | undefined): boolean => {
  if (value?.type === "Literal") return typeof value.value === "string" && value.value.trim() !== "";
  return value?.type === "JSXExpressionContainer";
};

const names = (attribute: AstNode): boolean => {
  if (attribute.type !== "JSXAttribute") return false;
  const name = attributeName(attribute);
  if (name === "aria-hidden") return hidesItself(attribute.value);
  if (NAMING_ATTRIBUTES.has(name)) return hasContent(attribute.value);
  if (name !== "role") return false;
  const role = attribute.value?.type === "Literal" ? attribute.value.value : null;
  return typeof role === "string" && DECORATIVE_ROLES.has(role);
};

export const noSvgWithoutTitle: Rule = problem(
  "Require an accessible name on an inline `<svg>`: a `<title>` child with content, an `aria-label`, or a marker that it is decorative. Every child counts, and a self-closing `<svg />` reports.",
  {
    createOnce(context: RuleContext) {
      const titleHasContent = (title: AstNode): boolean =>
        (title.type === "JSXElement" ? title.children : []).some((child: AstNode) => {
          if (child.type === "JSXText") return child.value.trim() !== "";
          if (child.type === "JSXExpressionContainer") {
            return !TRIVIAL_EXPRESSION.test(context.sourceCode.getText(child.expression).trim());
          }
          return child.type === "JSXElement" || child.type === "JSXFragment";
        });

      return {
        before() {
          return context.sourceCode.text.includes("<svg");
        },
        JSXElement(node) {
          const opening = node.openingElement;
          if (opening.name.type !== "JSXIdentifier" || opening.name.name !== "svg") return;
          if (opening.attributes.some(names)) return;

          for (const child of node.children) {
            if (child.type !== "JSXElement") continue;
            const childName = child.openingElement.name;
            if (childName.type !== "JSXIdentifier" || childName.name !== "title") continue;
            if (titleHasContent(child)) return;
          }

          context.report({ node: opening.name, message: NO_SVG_NAME });
        },
      };
    },
  }
);
