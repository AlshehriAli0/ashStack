import { calleeName, isFunction } from "../../../lib/ast.js";
import type { AstNode } from "../../../lib/types.js";

/** Calls whose first argument is one query's options: the `queryKey` and the `queryFn` that fills it. */
export const QUERY_OPTIONS_CALLS = new Set([
  "queryOptions",
  "infiniteQueryOptions",
  "useQuery",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useSuspenseInfiniteQuery",
]);

/** Calls whose first argument is a mutation's options. */
export const MUTATION_OPTIONS_CALLS = new Set(["useMutation", "mutationOptions"]);

/** The object literal a call to one of `calls` takes as its options, or `null`. */
export const optionsArgument = (node: AstNode, calls: ReadonlySet<string>): AstNode | null => {
  if (node.type !== "CallExpression" || !calls.has(calleeName(node))) return null;
  const [first] = node.arguments;
  return first?.type === "ObjectExpression" ? first : null;
};

/** The inline functions a `queryFn` value can run: the value itself, or the function branches of `id ? fn : skipToken`. */
export const queryFunctions = (value: AstNode | null): AstNode[] => {
  if (value?.type === "ConditionalExpression") return [value.consequent, value.alternate].filter(isFunction);
  return value !== null && isFunction(value) ? [value] : [];
};
