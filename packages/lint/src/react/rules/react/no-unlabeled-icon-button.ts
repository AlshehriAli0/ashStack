import { attributeName, findInSubtree, gate, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { attributeHasContent, childNames, namedBy, NAMING_ATTRIBUTES } from "./shared.js";

const BUTTON_TAGS = new Set(["button", "Button"]);

const NO_ACCESSIBLE_NAME =
  "Add an `aria-label` (or `aria-labelledby`), or render visible text, so this icon-only button has an accessible name. An `<img alt>` or an `<svg><title>` inside it counts too.";

const hasAltText = (attribute: AstNode): boolean =>
  attribute.type === "JSXAttribute" && attributeName(attribute) === "alt" && attributeHasContent(attribute.value);

const isLabeledImage = (node: AstNode): boolean =>
  node.type === "JSXOpeningElement" && tagIdentifier(node.name) === "img" && node.attributes.some(hasAltText);

export const noUnlabeledIconButton: Rule = problem(
  "Require an accessible name on an icon-only `<button>` or `<Button>`. Without a label, visible text or image alt text, a screen reader cannot reach the control.",
  {
    createOnce(context: RuleContext) {
      const names = (node: AstNode): boolean => childNames(node, context) || isLabeledImage(node);

      return {
        before() {
          return gate(context, "button", "Button");
        },
        JSXElement(node) {
          const opening = node.openingElement;
          if (opening.name.type !== "JSXIdentifier" || !BUTTON_TAGS.has(opening.name.name)) return;
          if (opening.attributes.some(attribute => namedBy(attribute, NAMING_ATTRIBUTES))) return;
          if (!node.children.some(child => child.type === "JSXElement" || child.type === "JSXFragment")) return;
          if (node.children.some(child => findInSubtree(child, names) !== null)) return;

          context.report({ node: opening.name, message: NO_ACCESSIBLE_NAME });
        },
      };
    },
  }
);
