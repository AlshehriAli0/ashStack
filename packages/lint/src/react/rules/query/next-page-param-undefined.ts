import { FUNCTION_TYPES, crossesFunctionBefore, findInSubtree, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { propertyKeyName } from "./shared.js";

const NEXT_PAGE_PARAM_NULL =
  "Return `undefined` to signal there are no more pages. `null` is a valid page param, so returning it reads as a real next cursor and the list keeps fetching forever.";

const returnsNull = (node: AstNode): boolean =>
  node.type === "ReturnStatement" && node.argument?.type === "Literal" && node.argument.value === null;

/** `() => null` returns null without a ReturnStatement to find. */
const arrowReturningNull = (node: AstNode): AstNode | null =>
  node.type === "ArrowFunctionExpression" && node.body.type === "Literal" && node.body.value === null
    ? node.body
    : null;

export const nextPageParamUndefined: Rule = problem("Disallow `return null` in the body of a `getNextPageParam`.", {
  createOnce(context: RuleContext) {
    return {
      before() {
        return gate(context, "getNextPageParam");
      },
      Property(node) {
        if (propertyKeyName(node) !== "getNextPageParam") return;
        const { value } = node;
        const found = arrowReturningNull(value) ?? findInSubtree(value, returnsNull);
        if (!found || crossesFunctionBefore(found, value, FUNCTION_TYPES)) return;
        context.report({ node: value, message: NEXT_PAGE_PARAM_NULL });
      },
    };
  },
});
