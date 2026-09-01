import { findInSubtree } from "../lib/ast.js";
import type { AstNode } from "../lib/types.js";

/** The object literal a stylesheet is built from. */
export type StylesObject = Extract<AstNode, { type: "ObjectExpression" }>;

/** Source-text gate for the stylesheet rules. Just the object, so `StyleSheet\n  .create(...)` still counts. */
export const CREATE_MARKER = "StyleSheet";

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
  if (node.type !== "Property" || node.computed) return "";
  const { key } = node;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return "";
};

const themeFunctionBody = (factory: AstNode): AstNode | null =>
  factory.type === "ArrowFunctionExpression" || factory.type === "FunctionExpression" ? factory.body : null;

const returnsAnObject = (node: AstNode): boolean =>
  node.type === "ReturnStatement" && node.argument?.type === "ObjectExpression";

const objectReturnedFrom = (body: AstNode): StylesObject | null => {
  if (body.type === "ObjectExpression") return body;
  const found = findInSubtree(body, returnsAnObject);
  if (found?.type !== "ReturnStatement" || found.argument?.type !== "ObjectExpression") return null;
  return found.argument;
};

/** The styles object a `StyleSheet.create` argument holds: a literal, or the one its theme function returns. */
export const stylesObjectOf = (factory: AstNode | null | undefined): StylesObject | null => {
  if (!factory) return null;
  if (factory.type === "ObjectExpression") return factory;
  const body = themeFunctionBody(factory);
  return body === null ? null : objectReturnedFrom(body);
};
