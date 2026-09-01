import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { propertyKeyName } from "./shared.js";

const NEXT_PAGE_PARAM_NULL =
  "Return `undefined` to signal there are no more pages. `null` is a valid page param, so returning it reads as a real next cursor and the list keeps fetching forever.";

const RETURNS_NULL = /\breturn\s+null\b/;

export const nextPageParamUndefined: Rule = problem(
  "Fires when the body of a `getNextPageParam` contains `return null`.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "getNextPageParam");
        },
        Property(node: AstNode) {
          if (node.type !== "Property" || propertyKeyName(node) !== "getNextPageParam") return;
          const body = context.sourceCode.getText(node.value);
          if (!RETURNS_NULL.test(body)) return;
          context.report({ node: node.value, message: NEXT_PAGE_PARAM_NULL });
        },
      };
    },
  }
);
