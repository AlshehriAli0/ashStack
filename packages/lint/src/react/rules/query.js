// @ashstack/lint — TanStack Query conventions.

const MESSAGES = {
  deprecatedFilters:
    "TanStack Query v5 removed the positional `(queryKey)` form. Pass a filter object: `.invalidateQueries({ queryKey: someKeys.scope(...) })`.",
  inlineQueryKey:
    "Inline `queryKey` arrays bypass the type-safe factory pattern. Define the key in a `*.keys.ts` factory and reference it: `queryKey: someKeys.scope(...)`.",
  inlineGetQueryData:
    "Inline query keys bypass the type-safe factory pattern. Use a factory: `getQueryData(someKeys.scope())`.",
  inlineSetQueryData:
    "Inline query keys bypass the type-safe factory pattern. Use a factory: `setQueryData(someKeys.scope(), updater)`.",
  destructureQueryHook:
    "Destructure the result of an API query/mutation hook at the call site: `const { data } = useFooQuery()` instead of `const foo = useFooQuery()`. Makes the read surface explicit and refactors safer.",
};

const FILTER_METHODS = new Set([
  "invalidateQueries",
  "removeQueries",
  "refetchQueries",
  "cancelQueries",
  "resetQueries",
]);
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
const API_HOOK_MODULE = /^@\/api\/.*\.(?:queries|mutations)$/;

const propertyKeyName = node =>
  node.key?.type === "Identifier" ? node.key.name : node.key?.type === "Literal" ? String(node.key.value) : "";

const BARE_FETCH = /\bfetch\s*\(/;
const RETURNS_NULL = /\breturn\s+null\b/;
const QUERY_FN_KEYS = new Set(["queryFn", "mutationFn"]);

const DATA_MESSAGES = {
  fetchInQueryFn:
    "Call a typed function from the feature's requests module instead. A bare fetch here skips the shared client, so it sends no auth header, applies no timeout, never retries a 429 or a 5xx, and throws a raw Response rather than the app's error type.",
  nextPageParamNull:
    "Return undefined to mean there are no more pages. null is a valid page param, so returning it tells the query the next cursor is null and the list keeps fetching forever.",
};

const noDeprecatedFilters = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the positional `(queryKey)` argument that TanStack Query v5 removed from invalidate/remove/refetch/cancel/resetQueries; pass a `{ queryKey }` filter object instead.",
    },
    hasSuggestions: true,
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== "MemberExpression") return;
        if (!FILTER_METHODS.has(callee.property?.name ?? "")) return;
        const argument = node.arguments?.[0];
        if (!argument || node.arguments.length !== 1) return;
        const source = context.sourceCode ?? context.getSourceCode();
        if (argument.type === "ArrayExpression") {
          const text = source.getText(argument);
          context.report({
            node: argument,
            message: MESSAGES.deprecatedFilters,
            suggest: [
              {
                desc: "Wrap in a filter object",
                fix: fixer => fixer.replaceText(argument, `{ queryKey: ${text} }`),
              },
            ],
          });
          return;
        }
        if (argument.type === "Literal" && typeof argument.value === "string") {
          const text = source.getText(argument);
          context.report({
            node: argument,
            message: MESSAGES.deprecatedFilters,
            suggest: [
              {
                desc: "Wrap in a filter object",
                fix: fixer => fixer.replaceText(argument, `{ queryKey: [${text}] }`),
              },
            ],
          });
        }
      },
    };
  },
};

const noInlineKeys = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline query-key arrays in query hooks, query-client methods and get/setQueryData; an inline key bypasses the type-safe `*.keys.ts` factory nothing else can invalidate against.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const method = callee?.type === "MemberExpression" ? (callee.property?.name ?? "") : "";
        if (method === "getQueryData" || method === "setQueryData") {
          const key = node.arguments?.[0];
          if (key?.type !== "ArrayExpression") return;
          context.report({
            node: key,
            message: method === "getQueryData" ? MESSAGES.inlineGetQueryData : MESSAGES.inlineSetQueryData,
          });
          return;
        }
        const isHook = callee?.type === "Identifier" && QUERY_KEY_HOOKS.has(callee.name);
        const isMethod = method !== "" && QUERY_KEY_METHODS.has(method);
        if (!isHook && !isMethod) return;
        const options = node.arguments?.[0];
        if (options?.type !== "ObjectExpression") return;
        for (const property of options.properties ?? []) {
          if (property.type !== "Property") continue;
          if ((property.key?.name ?? property.key?.value) !== "queryKey") continue;
          if (property.value?.type !== "ArrayExpression") continue;
          context.report({ node: property.value, message: MESSAGES.inlineQueryKey });
        }
      },
    };
  },
};

const requireDestructuredHooks = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require destructuring the result of a hook imported from an `@/api/*.queries` or `@/api/*.mutations` module, so the read surface is explicit at the call site and refactors stay safe.",
    },
  },
  createOnce(context) {
    const apiHooks = new Set();
    const candidates = [];
    return {
      before() {
        apiHooks.clear();
        candidates.length = 0;
      },
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string" || !API_HOOK_MODULE.test(source)) return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type === "ImportSpecifier" && specifier.local?.name) apiHooks.add(specifier.local.name);
        }
      },
      VariableDeclarator(node) {
        if (node.id?.type !== "Identifier") return;
        if (node.init?.type !== "CallExpression" || node.init.callee?.type !== "Identifier") return;
        if (!/^use[A-Z]/.test(node.init.callee.name)) return;
        candidates.push({ node, hook: node.init.callee.name });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!apiHooks.has(candidate.hook)) continue;
          context.report({ node: candidate.node.id, message: MESSAGES.destructureQueryHook });
        }
      },
    };
  },
};

const noFetchInQueryFn = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a bare `fetch(` inside a `queryFn` or `mutationFn`; it skips the shared client, so it sends no auth header, applies no timeout, retries nothing and throws a raw Response.",
    },
  },
  createOnce(context) {
    return {
      before() {
        const text = context.sourceCode?.getText?.();
        return text === undefined || text.includes("queryFn") || text.includes("mutationFn");
      },
      Property(node) {
        if (!QUERY_FN_KEYS.has(propertyKeyName(node))) return;
        const body = context.sourceCode?.getText?.(node.value) ?? "";
        if (!BARE_FETCH.test(body)) return;
        context.report({ node: node.value, message: DATA_MESSAGES.fetchInQueryFn });
      },
    };
  },
};

const nextPageParamUndefined = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow returning `null` from `getNextPageParam`; null is a valid page param, so it reads as a real next cursor and the list keeps fetching forever — return undefined to end pagination.",
    },
  },
  createOnce(context) {
    return {
      before() {
        return context.sourceCode?.getText?.()?.includes("getNextPageParam") !== false;
      },
      Property(node) {
        if (propertyKeyName(node) !== "getNextPageParam") return;
        const body = context.sourceCode?.getText?.(node.value) ?? "";
        if (!RETURNS_NULL.test(body)) return;
        context.report({ node: node.value, message: DATA_MESSAGES.nextPageParamNull });
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/query" },
  rules: {
    "no-inline-keys": noInlineKeys,
    "no-deprecated-filters": noDeprecatedFilters,
    "require-destructured-hooks": requireDestructuredHooks,
    "no-fetch-in-query-fn": noFetchInQueryFn,
    "next-page-param-undefined": nextPageParamUndefined,
  },
};
