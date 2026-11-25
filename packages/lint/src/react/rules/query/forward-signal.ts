import { calleeName, findInSubtree, gate, problem, propertyKeyName, propertyValue } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { optionsArgument, QUERY_OPTIONS_CALLS, queryFunctions } from "./shared.js";

/** A feature's request module: `./posts.requests`, `@/api/posts/posts.requests`. */
const REQUESTS_MODULE = /\.requests$/;

/** Whether a `queryFn` leaves its context's `signal` unread: no parameter, or a destructure that skips it. */
const dropsSignal = (fn: AstNode): boolean => {
  if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return false;
  const [queryContext] = fn.params;
  if (queryContext === undefined) return true;
  if (queryContext.type !== "ObjectPattern") return false;
  return queryContext.properties.every(
    property => property.type === "Property" && propertyKeyName(property) !== "signal"
  );
};

export const forwardSignal: Rule = problem(
  "Require an inline `queryFn` that calls a `*.requests` function to take the `signal` from its context. TanStack Query aborts that signal when the query is cancelled or nothing uses it any more, and only a request that received it can stop.",
  {
    createOnce(context: RuleContext) {
      const requests = new Set<string>();
      return {
        before() {
          requests.clear();
          return gate(context, ".requests");
        },
        ImportDeclaration(node) {
          if (!REQUESTS_MODULE.test(node.source.value)) return;
          for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportNamespaceSpecifier") requests.add(specifier.local.name);
          }
        },
        CallExpression(node) {
          const options = optionsArgument(node, QUERY_OPTIONS_CALLS);
          for (const fn of queryFunctions(propertyValue(options, "queryFn"))) {
            if (!dropsSignal(fn)) continue;
            const call = findInSubtree(
              fn,
              inner =>
                inner.type === "CallExpression" && inner.callee.type === "Identifier" && requests.has(inner.callee.name)
            );
            if (call === null) continue;
            context.report({
              node: fn,
              message: `Take \`{ signal }\` in this \`queryFn\` and pass it to \`${calleeName(call)}\`, on through to the client. TanStack Query aborts it when the query is cancelled or unused, and only a request that received it stops.`,
            });
          }
        },
      };
    },
  }
);
