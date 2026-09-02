import { attributeName } from "../../../lib/ast.js";
import type { AstNode, RuleContext } from "../../../lib/types.js";

/** The two attributes that name an element outright. */
export const NAMING_ATTRIBUTES = new Set(["aria-label", "aria-labelledby"]);

/** An expression a screen reader reads as nothing: `{null}`, `{false}`, `{""}`. */
const TRIVIAL_EXPRESSION = /^(?:null|undefined|false|true|""|''|``)$/;

/** An `aria-label=""` names nothing, so an attribute has to carry content to count. */
export const attributeHasContent = (value: AstNode | null | undefined): boolean => {
  if (value?.type === "Literal") return typeof value.value === "string" && value.value.trim() !== "";
  return value?.type === "JSXExpressionContainer";
};

/** Whether this attribute is one of `wanted` and carries content. */
export const namedBy = (attribute: AstNode, wanted: ReadonlySet<string>): boolean =>
  attribute.type === "JSXAttribute" && wanted.has(attributeName(attribute)) && attributeHasContent(attribute.value);

/** Whether a JSX child puts text where a screen reader reaches it. */
export const childNames = (child: AstNode, context: RuleContext): boolean => {
  if (child.type === "JSXText") return child.value.trim() !== "";
  if (child.type !== "JSXExpressionContainer") return false;
  return !TRIVIAL_EXPRESSION.test(context.sourceCode.getText(child.expression).trim());
};
