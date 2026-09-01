import { attributeName, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode } from "../../../lib/types.js";

/** A JSX element node, the only shape the list rules look at. */
export type ListElement = Extract<AstNode, { type: "JSXElement" }>;

type Attribute = Extract<AstNode, { type: "JSXAttribute" }>;

type AttributeItem = Extract<AstNode, { type: "JSXAttribute" | "JSXSpreadAttribute" }>;

export const LIST = "LegendList";

export const isListElement = (node: AstNode): boolean =>
  node.type === "JSXElement" && tagIdentifier(node.openingElement.name).endsWith(LIST);

export const attributesOf = (node: AstNode): AttributeItem[] =>
  node.type === "JSXElement" ? node.openingElement.attributes : [];

export const attributeNamed = (node: AstNode, wanted: string): Attribute | undefined => {
  for (const attribute of attributesOf(node)) {
    if (attribute.type === "JSXAttribute" && attributeName(attribute) === wanted) return attribute;
  }
  return undefined;
};

export const hasSpread = (node: AstNode): boolean =>
  attributesOf(node).some(attribute => attribute.type === "JSXSpreadAttribute");

export const expressionOf = (attribute: AstNode | null | undefined): AstNode | null => {
  if (attribute?.type !== "JSXAttribute") return null;
  const { value } = attribute;
  return value?.type === "JSXExpressionContainer" ? value.expression : null;
};

export const literalKind = (node: AstNode | null | undefined): "object" | "array" | null => {
  if (node?.type === "ObjectExpression") return "object";
  if (node?.type === "ArrayExpression") return "array";
  return null;
};
