import { attributeName, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { expressionOf } from "./shared.js";

type StyleObject = Extract<AstNode, { type: "ObjectExpression" }>;

const keyName = (property: AstNode): string | null => {
  if (property.type !== "Property") return null;
  const { key } = property;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return null;
};

const objectHasFlex = (node: AstNode | null | undefined): boolean =>
  node?.type === "ObjectExpression" &&
  node.properties.some(property => property.type === "Property" && keyName(property) === "flex");

const isStyleSheetCreate = (node: AstNode): boolean => {
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  const { object, property } = callee;
  return (
    object.type === "Identifier" &&
    object.name === "StyleSheet" &&
    property.type === "Identifier" &&
    property.name === "create"
  );
};

const bodyOf = (node: AstNode): AstNode | null =>
  node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration"
    ? node.body
    : null;

const objectReturnedBy = (themeFunction: AstNode): StyleObject | null => {
  const body = bodyOf(themeFunction);
  if (body?.type === "ObjectExpression") return body;
  if (body?.type !== "BlockStatement") return null;
  const returned = body.body.find(statement => statement.type === "ReturnStatement");
  if (returned?.type !== "ReturnStatement") return null;
  const { argument } = returned;
  return argument?.type === "ObjectExpression" ? argument : null;
};

/** The styles object given to `StyleSheet.create`: a literal, or the one a (unistyles) theme function returns. */
const createdStyleObject = (node: AstNode): StyleObject | null => {
  if (node.type !== "CallExpression") return null;
  const argument = node.arguments[0];
  if (argument?.type === "ObjectExpression") return argument;
  return isFunction(argument) ? objectReturnedBy(argument) : null;
};

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
          const object = createdStyleObject(node);
          if (!object) return;

          for (const property of object.properties) {
            if (property.type !== "Property" || property.computed) continue;
            const name = keyName(property);
            if (name !== null && objectHasFlex(property.value)) styleKeysWithFlex.add(name);
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
