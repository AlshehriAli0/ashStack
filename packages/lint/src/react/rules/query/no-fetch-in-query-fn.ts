import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { propertyKeyName, type SourceContext } from "./shared.js";

const FETCH_IN_QUERY_FN =
  "Call a typed function from the feature's `*.requests.ts` module here instead of `fetch`. That client is what sends the auth header, applies the timeout, retries a 429 or 5xx, and throws the app's error type.";

const BARE_FETCH = /\bfetch\s*\(/;
const QUERY_FN_KEYS = new Set(["queryFn", "mutationFn"]);

export const noFetchInQueryFn: Rule = problem("Looks inside every `queryFn` and `mutationFn` for a bare `fetch(`.", {
  createOnce(context: SourceContext) {
    return {
      before() {
        return gate(context, "queryFn", "mutationFn");
      },
      Property(node: AstNode) {
        if (!QUERY_FN_KEYS.has(propertyKeyName(node))) return;
        const body = context.sourceCode?.getText?.(node.value as AstNode) ?? "";
        if (!BARE_FETCH.test(body)) return;
        context.report({ node: node.value as AstNode, message: FETCH_IN_QUERY_FN });
      },
    };
  },
});
