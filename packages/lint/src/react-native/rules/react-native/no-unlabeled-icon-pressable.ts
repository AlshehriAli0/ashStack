import { problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { asNode, asNodes } from "./shared.js";

const TOUCHABLES = new Set(["Pressable", "PressableScale", "TouchableOpacity", "TouchableHighlight"]);

const MESSAGES = {
  touchable:
    "Add an `accessibilityLabel` (plus an `accessibilityHint` when the outcome is not obvious), or render a visible `<Text>` child, so this icon-only touchable has an accessible name.",
  expoButton:
    "Add a `label`, or an `accessibilityLabel(...)` modifier, so this icon-only Expo UI `<Button>` has an accessible name.",
};

export const noUnlabeledIconPressable: Rule = problem(
  "Requires an accessible name on an icon-only touchable or an icon-only Expo UI `<Button>`. Without a label, hint or visible text, a screen reader cannot reach the control.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXElement(node) {
          const opening = asNode(node.openingElement);
          const tag = tagIdentifier(asNode(opening?.name));
          if (!TOUCHABLES.has(tag)) return;
          const attributes = asNodes(opening?.attributes);
          const labelled = attributes.some(attribute => {
            const name = asNode(attribute.name)?.name;
            return attribute.type === "JSXAttribute" && (name === "accessibilityLabel" || name === "accessibilityHint");
          });
          if (labelled) return;
          const children = asNodes(node.children);
          let hasIcon = false;
          let hasText = false;
          let hasExpression = false;
          for (const child of children) {
            if (child.type === "JSXExpressionContainer") hasExpression = true;
            if (child.type !== "JSXElement") continue;
            const childTag = tagIdentifier(asNode(asNode(child.openingElement)?.name));
            if (childTag === "Text") hasText = true;
            if (childTag.endsWith("Icon")) hasIcon = true;
          }
          if (!hasIcon || hasText || hasExpression) return;
          context.report({ node: asNode(opening?.name) as AstNode, message: MESSAGES.touchable });
        },
        JSXOpeningElement(node) {
          if (node.selfClosing !== true) return;
          if (tagIdentifier(asNode(node.name)) !== "Button") return;
          const names = new Set(
            asNodes(node.attributes)
              .filter(attribute => attribute.type === "JSXAttribute")
              .map(attribute => asNode(attribute.name)?.name as string | undefined)
              .filter(Boolean)
          );
          if (!names.has("systemImage")) return;
          if (
            names.has("label") ||
            names.has("accessibilityLabel") ||
            names.has("accessibilityHint") ||
            names.has("modifiers")
          ) {
            return;
          }
          context.report({ node: asNode(node.name) as AstNode, message: MESSAGES.expoButton });
        },
      };
    },
  }
);
