import { problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const TOUCHABLES = new Set(["Pressable", "PressableScale", "TouchableOpacity", "TouchableHighlight"]);

const MESSAGES = {
  touchable:
    "Add an `accessibilityLabel` (plus an `accessibilityHint` when the outcome is not obvious), or render a visible `<Text>` child, so this icon-only touchable has an accessible name.",
  expoButton:
    "Add a `label`, or an `accessibilityLabel(...)` modifier, so this icon-only Expo UI `<Button>` has an accessible name.",
};

/** A plain (non-namespaced) attribute's name; anything else reads as `undefined`. */
const plainAttributeName = (attribute: AstNode): string | undefined =>
  attribute.type === "JSXAttribute" && attribute.name.type === "JSXIdentifier" ? attribute.name.name : undefined;

const hasAccessibleName = (attributes: readonly AstNode[]): boolean =>
  attributes.some(attribute => {
    const name = plainAttributeName(attribute);
    return name === "accessibilityLabel" || name === "accessibilityHint";
  });

interface ChildKinds {
  hasIcon: boolean;
  hasText: boolean;
  hasExpression: boolean;
}

const childKinds = (children: readonly AstNode[]): ChildKinds => {
  const kinds: ChildKinds = { hasIcon: false, hasText: false, hasExpression: false };
  for (const child of children) {
    if (child.type === "JSXExpressionContainer") kinds.hasExpression = true;
    if (child.type !== "JSXElement") continue;
    const childTag = tagIdentifier(child.openingElement.name);
    if (childTag === "Text") kinds.hasText = true;
    if (childTag.endsWith("Icon")) kinds.hasIcon = true;
  }
  return kinds;
};

export const noUnlabeledIconPressable: Rule = problem(
  "Requires an accessible name on an icon-only touchable or an icon-only Expo UI `<Button>`. Without a label, hint or visible text, a screen reader cannot reach the control.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXElement(node) {
          if (node.type !== "JSXElement") return;
          const opening = node.openingElement;
          const tag = tagIdentifier(opening.name);
          if (!TOUCHABLES.has(tag)) return;
          if (hasAccessibleName(opening.attributes)) return;
          const { hasIcon, hasText, hasExpression } = childKinds(node.children);
          if (!hasIcon || hasText || hasExpression) return;
          context.report({ node: opening.name, message: MESSAGES.touchable });
        },
        JSXOpeningElement(node) {
          if (node.type !== "JSXOpeningElement") return;
          if (node.selfClosing !== true) return;
          if (tagIdentifier(node.name) !== "Button") return;
          const names = new Set(node.attributes.map(plainAttributeName).filter(Boolean));
          if (!names.has("systemImage")) return;
          if (
            names.has("label") ||
            names.has("accessibilityLabel") ||
            names.has("accessibilityHint") ||
            names.has("modifiers")
          ) {
            return;
          }
          context.report({ node: node.name, message: MESSAGES.expoButton });
        },
      };
    },
  }
);
