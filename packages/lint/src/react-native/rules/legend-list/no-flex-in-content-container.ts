// The stylesheet is usually declared below the component, so the styles are
// collected across the whole file and the report happens at the end.
import { attributeName, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { expressionOf, type GateContext } from "./shared.js";

const keyName = (property: AstNode): string | null => {
  const key = property.key as AstNode | undefined;
  if (key?.type === "Identifier") return key.name as string;
  if (key?.type === "Literal") return String(key.value);
  return null;
};

const objectHasFlex = (node: AstNode | null | undefined): boolean =>
  node?.type === "ObjectExpression" &&
  (node.properties as AstNode[]).some(property => property.type === "Property" && keyName(property) === "flex");

const isStyleSheetCreate = (node: AstNode): boolean => {
  const callee = node.callee as AstNode | undefined;
  return (
    callee?.type === "MemberExpression" &&
    (callee.object as AstNode | undefined)?.name === "StyleSheet" &&
    (callee.property as AstNode | undefined)?.name === "create"
  );
};

// StyleSheet.create accepts an object, or (unistyles) a theme function returning one.
const createdObject = (node: AstNode): AstNode | null => {
  const argument = ((node.arguments as AstNode[] | undefined) ?? [])[0];
  if (argument?.type === "ObjectExpression") return argument;
  if (!isFunction(argument)) return null;
  const body = argument?.body as AstNode | undefined;
  if (body?.type === "ObjectExpression") return body;
  if (body?.type !== "BlockStatement") return null;
  const returned = ((body.body as AstNode[] | undefined) ?? []).find(statement => statement.type === "ReturnStatement");
  const returnArgument = returned?.argument as AstNode | undefined;
  return returnArgument?.type === "ObjectExpression" ? returnArgument : null;
};

export const noFlexInContentContainer: Rule = problem(
  "Disallow `flex` in a Legend List's `contentContainerStyle`, where it sizes the scrolled content to the viewport and the list ends up measuring zero height.",
  {
    createOnce(context: GateContext) {
      let flexStyles: Set<string>;
      let candidates: { node: AstNode; named: string | null }[];

      return {
        before() {
          flexStyles = new Set();
          candidates = [];
          return gate(context, "contentContainerStyle");
        },
        CallExpression(node) {
          if (!isStyleSheetCreate(node)) return;
          const object = createdObject(node);
          if (!object) return;

          for (const property of object.properties as AstNode[]) {
            if (property.type !== "Property" || property.computed) continue;
            const name = keyName(property);
            if (name !== null && objectHasFlex(property.value as AstNode | undefined)) flexStyles.add(name);
          }
        },
        JSXAttribute(node) {
          if (attributeName(node) !== "contentContainerStyle") return;

          const value = expressionOf(node);
          if (objectHasFlex(value)) {
            candidates.push({ node, named: null });
            return;
          }
          if (value?.type === "MemberExpression" && (value.object as AstNode | undefined)?.name === "styles") {
            candidates.push({ node, named: ((value.property as AstNode | undefined)?.name as string) ?? null });
          }
        },
        "Program:exit"() {
          for (const { node, named } of candidates) {
            if (named !== null && !flexStyles.has(named)) continue;

            context.report({
              node,
              message:
                "Move `flex` onto `style` and keep `contentContainerStyle` for padding inside the content. On the content container it sizes the content to the viewport, so the list measures as zero height and renders a blank screen with no error.",
            });
          }
        },
      };
    },
  }
);
