import { attributeName, bindingOf, componentName } from "../../../lib/ast.js";
import type { AstNode, RuleContext, Variable } from "../../../lib/types.js";

/** A JSX element node, the only shape the list rules look at. */
export type ListElement = Extract<AstNode, { type: "JSXElement" }>;

type Attribute = Extract<AstNode, { type: "JSXAttribute" }>;

type AttributeItem = Extract<AstNode, { type: "JSXAttribute" | "JSXSpreadAttribute" }>;

export const LIST = "LegendList";

type TypeWrapper = Extract<
  AstNode,
  { type: "TSInstantiationExpression" | "TSAsExpression" | "TSSatisfiesExpression" | "TSNonNullExpression" }
>;

const TYPE_WRAPPERS = new Set([
  "TSInstantiationExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
]);

/** `LegendList<Item>`, `LegendList as never`: a type around the value that leaves the value alone. */
const isTypeWrapper = (node: AstNode): node is TypeWrapper => TYPE_WRAPPERS.has(node.type);

const aliasCache = new WeakMap<Variable, boolean>();

/**
 * Whether an expression is the list, seen through a local alias and wrapping calls:
 * `LegendList`, `withUnistyles(LegendList<Item>)`, `memo(styled(LegendList))`. A call
 * counts by its first argument, the component it wraps. A binding is marked "not a list"
 * before its initialiser is read, so one that refers to itself ends there.
 */
const isListValue = (context: RuleContext, node: AstNode | null | undefined): boolean => {
  if (!node) return false;
  if (isTypeWrapper(node)) return isListValue(context, node.expression);
  if (node.type === "CallExpression") return isListValue(context, node.arguments[0]);
  if (componentName(node) === LIST) return true;

  const binding = bindingOf(context, node);
  if (!binding) return false;
  const cached = aliasCache.get(binding);
  if (cached !== undefined) return cached;
  aliasCache.set(binding, false);
  const declarator = binding.defs[0]?.node;
  const resolved =
    declarator?.type === "VariableDeclarator" &&
    declarator.id.type === "Identifier" &&
    isListValue(context, declarator.init);
  aliasCache.set(binding, resolved);
  return resolved;
};

/** A `LegendList` element, under its own name or a local alias that wraps it. */
export const isListElement = (context: RuleContext, node: AstNode | null | undefined): node is ListElement =>
  node?.type === "JSXElement" && isListValue(context, node.openingElement.name);

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
