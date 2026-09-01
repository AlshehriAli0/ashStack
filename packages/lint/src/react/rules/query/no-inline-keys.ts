import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGES = {
  inlineQueryKey:
    "Define this key in the feature's `*.keys.ts` factory and reference it: `queryKey: someKeys.scope(...)`, so invalidation elsewhere matches the same key.",
  inlineGetQueryData: "Read through the feature's `*.keys.ts` factory: `getQueryData(someKeys.scope())`.",
  inlineSetQueryData: "Write through the feature's `*.keys.ts` factory: `setQueryData(someKeys.scope(), updater)`.",
};

const QUERY_KEY_HOOKS = new Set([
  "useQuery",
  "useSuspenseQuery",
  "useInfiniteQuery",
  "useSuspenseInfiniteQuery",
  "useQueries",
]);
const QUERY_KEY_METHODS = new Set([
  "invalidateQueries",
  "removeQueries",
  "refetchQueries",
  "cancelQueries",
  "resetQueries",
  "fetchQuery",
  "prefetchQuery",
  "ensureQueryData",
  "getQueriesData",
  "setQueriesData",
]);

const methodName = (node: AstNode): string => {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return "";
  return ((callee.property as AstNode | undefined)?.name as string | undefined) ?? "";
};

const firstArgumentArray = (node: AstNode): AstNode | undefined => {
  const first = (node.arguments as AstNode[] | undefined)?.[0];
  return first?.type === "ArrayExpression" ? first : undefined;
};

const takesQueryKeyOptions = (node: AstNode, method: string): boolean => {
  const callee = node.callee as AstNode | undefined;
  const isHook = callee?.type === "Identifier" && QUERY_KEY_HOOKS.has(callee.name as string);
  return isHook || (method !== "" && QUERY_KEY_METHODS.has(method));
};

const isQueryKeyProperty = (property: AstNode): boolean => {
  if (property.type !== "Property") return false;
  const key = property.key as AstNode | undefined;
  return ((key?.name as string | undefined) ?? (key?.value as string | undefined)) === "queryKey";
};

const inlineQueryKeys = (node: AstNode): AstNode[] => {
  const options = (node.arguments as AstNode[] | undefined)?.[0];
  if (options?.type !== "ObjectExpression") return [];
  const inline: AstNode[] = [];
  for (const property of (options.properties as AstNode[] | undefined) ?? []) {
    if (!isQueryKeyProperty(property)) continue;
    const value = property.value as AstNode | undefined;
    if (value?.type === "ArrayExpression") inline.push(value);
  }
  return inline;
};

export const noInlineKeys: Rule = problem(
  "Fires when a query key is written as an array literal at the call site instead of coming from a keys factory.",
  {
    createOnce(context: RuleContext) {
      return {
        CallExpression(node: AstNode) {
          const method = methodName(node);
          if (method === "getQueryData" || method === "setQueryData") {
            const key = firstArgumentArray(node);
            if (key === undefined) return;
            context.report({
              node: key,
              message: method === "getQueryData" ? MESSAGES.inlineGetQueryData : MESSAGES.inlineSetQueryData,
            });
            return;
          }
          if (!takesQueryKeyOptions(node, method)) return;
          for (const key of inlineQueryKeys(node)) {
            context.report({ node: key, message: MESSAGES.inlineQueryKey });
          }
        },
      };
    },
  }
);
