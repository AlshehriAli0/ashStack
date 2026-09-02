import { attributeName, findInSubtree, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BUTTON_TAGS = new Set(["button", "Button"]);
const NAMING_ATTRIBUTES = new Set(["aria-label", "aria-labelledby"]);

/** An expression child that names nothing: `{null}`, `{false}`, `{""}`. */
const TRIVIAL_EXPRESSION = /^(?:null|undefined|false|true|""|''|``)$/;

const NO_ACCESSIBLE_NAME =
  "Add an `aria-label` (or `aria-labelledby`), or render visible text, so this icon-only button has an accessible name. An `<img alt>` or an `<svg><title>` inside it counts too.";

const namesSomething = (attribute: AstNode, wanted: ReadonlySet<string>): boolean => {
  if (attribute.type !== "JSXAttribute") return false;
  if (!wanted.has(attributeName(attribute))) return false;
  const { value } = attribute;
  if (value?.type === "Literal") return typeof value.value === "string" && value.value.trim() !== "";
  return value?.type === "JSXExpressionContainer";
};

const ALT = new Set(["alt"]);

export const noUnlabeledIconButton: Rule = problem(
  "Require an accessible name on an icon-only `<button>` or `<Button>`. Without a label, visible text or image alt text, a screen reader cannot reach the control.",
  {
    createOnce(context: RuleContext) {
      const names = (node: AstNode): boolean => {
        if (node.type === "JSXText") return node.value.trim() !== "";
        if (node.type === "JSXExpressionContainer") {
          return !TRIVIAL_EXPRESSION.test(context.sourceCode.getText(node.expression).trim());
        }
        if (node.type !== "JSXOpeningElement") return false;
        if (tagIdentifier(node.name) !== "img") return false;
        return node.attributes.some(attribute => namesSomething(attribute, ALT));
      };

      return {
        before() {
          return context.sourceCode.text.includes("button") || context.sourceCode.text.includes("Button");
        },
        JSXElement(node) {
          const opening = node.openingElement;
          if (opening.name.type !== "JSXIdentifier" || !BUTTON_TAGS.has(opening.name.name)) return;
          if (opening.attributes.some(attribute => namesSomething(attribute, NAMING_ATTRIBUTES))) return;

          const elementChildren = node.children.filter(
            child => child.type === "JSXElement" || child.type === "JSXFragment"
          );
          if (elementChildren.length === 0) return;
          if (node.children.some(child => findInSubtree(child, names) !== null)) return;

          context.report({ node: opening.name, message: NO_ACCESSIBLE_NAME });
        },
      };
    },
  }
);
