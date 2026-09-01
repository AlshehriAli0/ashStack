import { attributeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, propertyName, stylesObjectOf } from "../../stylesheet.js";
import { expressionOf } from "./shared.js";

const MESSAGE =
  "Move `flex` onto `style` and keep `contentContainerStyle` for padding inside the content. On the content container it sizes the content to the viewport, so the list measures as zero height and renders a blank screen with no error.";

const hasFlexKey = (node: AstNode | null | undefined): boolean =>
  node?.type === "ObjectExpression" &&
  node.properties.some(
    property => property.type === "Property" && !property.computed && propertyName(property) === "flex"
  );

/** `styles.content` and `styles["content"]` both read as that pair; a dynamic key reads as null. */
const styleReference = (node: AstNode | null | undefined): { sheet: string; key: string } | null => {
  if (node?.type !== "MemberExpression" || node.object.type !== "Identifier") return null;
  const sheet = node.object.name;
  if (!node.computed && node.property.type === "Identifier") return { sheet, key: node.property.name };
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string") {
    return { sheet, key: node.property.value };
  }
  return null;
};

/** A style prop holds one style or an array of them; both read as a list. */
const styleParts = (value: AstNode | null | undefined): AstNode[] => {
  if (!value) return [];
  if (value.type !== "ArrayExpression") return [value];
  return value.elements.filter(element => element !== null);
};

export const noFlexInContentContainer: Rule = problem(
  "Disallow `flex` in a Legend List's `contentContainerStyle`, where it sizes the scrolled content to the viewport and the list ends up measuring zero height.",
  {
    createOnce(context) {
      let flexKeysBySheet = new Map<string, Set<string>>();
      let candidates: { node: AstNode; parts: AstNode[] }[] = [];

      const holdsFlex = (part: AstNode): boolean => {
        if (hasFlexKey(part)) return true;
        const reference = styleReference(part);
        return reference !== null && (flexKeysBySheet.get(reference.sheet)?.has(reference.key) ?? false);
      };

      return {
        before() {
          flexKeysBySheet = new Map();
          candidates = [];
          return gate(context, "contentContainerStyle");
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type !== "Identifier" || init?.type !== "CallExpression" || !isStyleSheetCreate(init)) return;
          const object = stylesObjectOf(init.arguments[0]);
          if (!object) return;

          const flexKeys = new Set<string>();
          for (const property of object.properties) {
            if (property.type !== "Property" || property.computed) continue;
            const name = propertyName(property);
            if (name !== "" && hasFlexKey(property.value)) flexKeys.add(name);
          }
          flexKeysBySheet.set(id.name, flexKeys);
        },
        JSXAttribute(node) {
          if (attributeName(node) !== "contentContainerStyle") return;
          const parts = styleParts(expressionOf(node));
          if (parts.length > 0) candidates.push({ node, parts });
        },
        "Program:exit"() {
          for (const { node, parts } of candidates) {
            if (parts.some(part => holdsFlex(part))) context.report({ node, message: MESSAGE });
          }
        },
      };
    },
  }
);
