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

export const noInlineKeys: Rule = problem(
  "Fires when a query key is written as an array literal at the call site instead of coming from a keys factory.",
  {
    createOnce(context: RuleContext) {
      return {
        CallExpression(node: AstNode) {
          const callee = node.callee as AstNode | undefined;
          const method =
            callee?.type === "MemberExpression"
              ? (((callee.property as AstNode | undefined)?.name as string | undefined) ?? "")
              : "";
          if (method === "getQueryData" || method === "setQueryData") {
            const key = (node.arguments as AstNode[] | undefined)?.[0];
            if (key?.type !== "ArrayExpression") return;
            context.report({
              node: key,
              message: method === "getQueryData" ? MESSAGES.inlineGetQueryData : MESSAGES.inlineSetQueryData,
            });
            return;
          }
          const isHook = callee?.type === "Identifier" && QUERY_KEY_HOOKS.has(callee.name as string);
          const isMethod = method !== "" && QUERY_KEY_METHODS.has(method);
          if (!isHook && !isMethod) return;
          const options = (node.arguments as AstNode[] | undefined)?.[0];
          if (options?.type !== "ObjectExpression") return;
          for (const property of (options.properties as AstNode[] | undefined) ?? []) {
            if (property.type !== "Property") continue;
            const key = property.key as AstNode | undefined;
            if (((key?.name as string | undefined) ?? (key?.value as string | undefined)) !== "queryKey") continue;
            const value = property.value as AstNode | undefined;
            if (value?.type !== "ArrayExpression") continue;
            context.report({ node: value, message: MESSAGES.inlineQueryKey });
          }
        },
      };
    },
  }
);
