import { attributeName } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BARE_JSX_ATTRIBUTE = 'Pass `t("<key>")` as this attribute value and add the key to every locale file.';

const NATIVE_TRANSLATABLE_ATTRIBUTES = ["placeholder", "accessibilityLabel", "accessibilityHint", "title"];

export const noBareAttrs: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Checks a configurable list of user-visible JSX attributes for a plain string literal value. It defaults to placeholder, accessibilityLabel, accessibilityHint and title.",
    },
    schema: [
      {
        type: "object",
        properties: { attributes: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context: RuleContext) {
    const attributes = new Set<string>();
    return {
      before() {
        attributes.clear();
        const configured = (context.options?.[0] as { attributes?: string[] } | undefined)?.attributes;
        for (const attribute of configured ?? NATIVE_TRANSLATABLE_ATTRIBUTES) {
          attributes.add(attribute);
        }
      },
      JSXAttribute(node: AstNode) {
        if (node.type !== "JSXAttribute" || !attributes.has(attributeName(node))) return;
        const { value } = node;
        if (value?.type !== "Literal" || typeof value.value !== "string" || value.value.length === 0) return;
        context.report({ node, message: BARE_JSX_ATTRIBUTE });
      },
    };
  },
};
