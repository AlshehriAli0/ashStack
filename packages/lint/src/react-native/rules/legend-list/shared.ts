import { attributeName, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, RuleContext } from "../../../lib/types.js";

/** oxlint's context, narrowed to the source text the `gate` helper reads. */
export type GateContext = RuleContext & { sourceCode?: { text?: string } };

export const LIST = "LegendList";

const isLegendListOrWrapper = (name: AstNode | null | undefined): boolean => tagIdentifier(name).endsWith(LIST);

export const isListElement = (node: AstNode): boolean =>
  isLegendListOrWrapper((node.openingElement as AstNode | undefined)?.name as AstNode | undefined);

export const attributesOf = (node: AstNode): AstNode[] =>
  ((node.openingElement as AstNode | undefined)?.attributes as AstNode[] | undefined) ?? [];

export const attributeNamed = (node: AstNode, wanted: string): AstNode | undefined =>
  attributesOf(node).find(attribute => attribute.type === "JSXAttribute" && attributeName(attribute) === wanted);

export const hasSpread = (node: AstNode): boolean =>
  attributesOf(node).some(attribute => attribute.type === "JSXSpreadAttribute");

export const expressionOf = (attribute: AstNode | null | undefined): AstNode | null => {
  const value = attribute?.value as AstNode | undefined;
  return value?.type === "JSXExpressionContainer" ? (value.expression as AstNode) : null;
};

export const literalKind = (node: AstNode | null | undefined): "object" | "array" | null => {
  if (node?.type === "ObjectExpression") return "object";
  if (node?.type === "ArrayExpression") return "array";
  return null;
};
