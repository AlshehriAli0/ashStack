import { findInSubtree } from "../lib/ast.js";
import type { AstNode } from "../lib/types.js";

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
