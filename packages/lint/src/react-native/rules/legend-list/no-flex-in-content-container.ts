import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, propertyName, stylesObjectOf } from "../../stylesheet.js";
import { expressionOf } from "./shared.js";

const objectHasFlex = (node: AstNode | null | undefined): boolean =>
  node?.type === "ObjectExpression" && node.properties.some(property => propertyName(property) === "flex");

export const noFlexInContentContainer: Rule = problem(
  "Disallow `flex` in a Legend List's `contentContainerStyle`, where it sizes the scrolled content to the viewport and the list ends up measuring zero height.",
  {
    createOnce(context) {
      let styleKeysWithFlex: Set<string>;
      let contentContainerAttributes: { node: AstNode; named: string | null }[];

      const reportFlexAtEndOfFile = (): void => {
        for (const { node, named } of contentContainerAttributes) {
          if (named !== null && !styleKeysWithFlex.has(named)) continue;

          context.report({
            node,
            message:
              "Move `flex` onto `style` and keep `contentContainerStyle` for padding inside the content. On the content container it sizes the content to the viewport, so the list measures as zero height and renders a blank screen with no error.",
          });
        }
      };

      return {
        before() {
          styleKeysWithFlex = new Set();
          contentContainerAttributes = [];
          return gate(context, "contentContainerStyle");
        },
        CallExpression(node) {
          if (!isStyleSheetCreate(node)) return;
          const object = stylesObjectOf(node.arguments[0]);
          if (!object) return;

          for (const property of object.properties) {
            if (property.type !== "Property" || property.computed) continue;
            const name = propertyName(property);
            if (name !== "" && objectHasFlex(property.value)) styleKeysWithFlex.add(name);
          }
        },
        JSXAttribute(node) {
          if (attributeName(node) !== "contentContainerStyle") return;

          const value = expressionOf(node);
          if (objectHasFlex(value)) {
            contentContainerAttributes.push({ node, named: null });
            return;
          }
          if (
            value?.type === "MemberExpression" &&
            value.object.type === "Identifier" &&
            value.object.name === "styles"
          ) {
            contentContainerAttributes.push({
              node,
              named: value.property.type === "Identifier" ? value.property.name : null,
            });
          }
        },
        "Program:exit": reportFlexAtEndOfFile,
      };
    },
  }
);
