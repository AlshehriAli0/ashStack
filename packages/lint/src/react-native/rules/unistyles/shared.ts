import { calleeName, findInSubtree, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext, Visitor } from "../../../lib/types.js";

/** The object literal a stylesheet is built from. */
export type StylesObject = Extract<AstNode, { type: "ObjectExpression" }>;

export const CREATE_MARKER = "StyleSheet.create";

export const isStyleSheetCreate = (node: AstNode | null | undefined): boolean => {
  if (node?.type !== "CallExpression") return false;
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

export const propertyName = (node: AstNode): string => {
  if (node.type !== "Property") return "";
  const { key } = node;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return "";
};

export const memberPath = (node: AstNode | null | undefined): string => {
  const parts: string[] = [];
  let current: AstNode | null | undefined = node;
  while (current?.type === "MemberExpression") {
    const { property } = current;
    if (property.type === "Identifier") parts.unshift(property.name);
    else if (property.type === "Literal") parts.unshift(String(property.value));
    else parts.unshift("*");
    current = current.object;
  }
  if (current?.type === "Identifier") parts.unshift(current.name);
  return parts.join(".");
};

const themeFunctionBody = (factory: AstNode): AstNode | null =>
  factory.type === "ArrowFunctionExpression" || factory.type === "FunctionExpression" ? factory.body : null;

const objectReturnedFrom = (body: AstNode): StylesObject | null => {
  if (body.type === "ObjectExpression") return body;
  if (body.type === "ParenthesizedExpression" && body.expression.type === "ObjectExpression") return body.expression;
  const found = findInSubtree(body, current => current.type === "ObjectExpression");
  return found?.type === "ObjectExpression" ? found : null;
};

/** The styles object a `StyleSheet.create` argument holds: a literal, or the one its theme function returns. */
export const stylesObjectOf = (factory: AstNode | null | undefined): StylesObject | null => {
  if (!factory) return null;
  if (factory.type === "ObjectExpression") return factory;
  const body = themeFunctionBody(factory);
  return body === null ? null : objectReturnedFrom(body);
};

export const declaresUseUnistylesTheme = (scope: AstNode): boolean =>
  subtreeHas(scope, current => {
    if (current.type !== "VariableDeclarator") return false;
    const { id, init } = current;
    return (
      id.type === "ObjectPattern" &&
      calleeName(init) === "useUnistyles" &&
      id.properties.some(
        property => property.type === "Property" && property.key.type === "Identifier" && property.key.name === "theme"
      )
    );
  });

export const readsTheme = (node: AstNode): boolean =>
  subtreeHas(node, current => current.type === "MemberExpression" && memberPath(current).startsWith("theme."));

/**
 * Builds a rule whose visitors only fire inside `StyleSheet.create(...)`, by tracking how deeply
 * nested the traversal currently is in such a call. The depth resets per file in `before()`, which
 * also runs the text gate.
 */
export const inCreate = (description: string, visit: (context: RuleContext, inside: () => boolean) => Visitor): Rule =>
  problem(description, {
    createOnce(context) {
      let createDepth = 0;
      const inside = () => createDepth > 0;
      const visitors = visit(context, inside);
      const { CallExpression: enter, "CallExpression:exit": exit } = visitors;
      return {
        ...visitors,
        before() {
          createDepth = 0;
          return gate(context, CREATE_MARKER);
        },
        CallExpression(node) {
          if (isStyleSheetCreate(node)) createDepth += 1;
          enter?.(node);
        },
        "CallExpression:exit"(node) {
          exit?.(node);
          if (isStyleSheetCreate(node)) createDepth -= 1;
        },
      };
    },
  });
