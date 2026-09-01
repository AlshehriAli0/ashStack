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
  if (node.type !== "CallExpression") return "";
  const { callee } = node;
  if (callee.type !== "MemberExpression") return "";
  const { property } = callee;
  return property.type === "Identifier" ? property.name : "";
};

const firstArgumentArray = (node: AstNode): AstNode | undefined => {
  if (node.type !== "CallExpression") return undefined;
  const [first] = node.arguments;
  return first?.type === "ArrayExpression" ? first : undefined;
};

const takesQueryKeyOptions = (node: AstNode, method: string): boolean => {
  const callee = node.type === "CallExpression" ? node.callee : undefined;
  const isHook = callee?.type === "Identifier" && QUERY_KEY_HOOKS.has(callee.name);
  return isHook || (method !== "" && QUERY_KEY_METHODS.has(method));
};

const isQueryKeyProperty = (property: AstNode): boolean => {
  if (property.type !== "Property") return false;
  const { key } = property;
  if (key.type === "Identifier") return key.name === "queryKey";
  return key.type === "Literal" && key.value === "queryKey";
};

const inlineQueryKeys = (node: AstNode): AstNode[] => {
  if (node.type !== "CallExpression") return [];
  const [options] = node.arguments;
  if (options?.type !== "ObjectExpression") return [];
  const inline: AstNode[] = [];
  for (const property of options.properties) {
    if (property.type !== "Property" || !isQueryKeyProperty(property)) continue;
    const { value } = property;
    if (value.type === "ArrayExpression") inline.push(value);
  }
  return inline;
};

export const noInlineKeys: Rule = problem(
  "Disallow a query key written as an array literal at the call site instead of coming from a keys factory.",
  {
    createOnce(context: RuleContext) {
      return {
        CallExpression(node) {
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
