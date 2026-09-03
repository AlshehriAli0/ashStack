import { gate, problem, propertyKeyName, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const FETCH_IN_QUERY_FN =
  "Call a typed function from the feature's `*.requests.ts` module here instead of `fetch` — it carries auth, retries and the app's error type.";

const QUERY_FN_KEYS = new Set(["queryFn", "mutationFn"]);

/** The global `fetch`, not a typed client's `api.fetch()`. */
const isBareFetch = (node: AstNode): boolean =>
  node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "fetch";

export const noFetchInQueryFn: Rule = problem("Disallow a bare `fetch(` inside a `queryFn` or `mutationFn`.", {
  createOnce(context: RuleContext) {
    return {
      before() {
        return gate(context, "queryFn", "mutationFn");
      },
      Property(node) {
        if (!QUERY_FN_KEYS.has(propertyKeyName(node))) return;
        if (!subtreeHas(node.value, isBareFetch)) return;
        context.report({ node: node.value, message: FETCH_IN_QUERY_FN });
      },
    };
  },
});
