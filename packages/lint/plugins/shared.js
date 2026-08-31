// @ashstack/lint — shared oxlint JS plugin. Rules that apply to any file in the
// stack: i18n, TanStack Query, Zod, comments, naming and project structure.
import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { calleeName, closestAncestor, hasAncestor, subtreeHas, tagIdentifier } from "./internal/ast.js";

const MESSAGES = {
  nativeEnum: "z.nativeEnum() is deprecated in Zod 4 — z.enum() accepts native enum objects with the same params.",
  literalUnion:
    "a union of string literals is a closed set — write z.enum([...]) so invalid input produces one issue and the options stay reusable.",
  bareJsxText: "bare JSX text — wrap with t() or <Trans>. Add the key under the locale translation files.",
  bareJsxAttribute: "bare translatable attribute — wrap with t(). Add the key under the locale translation files.",
  bareToast: "bare toast message — wrap with t() so every locale resolves.",
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
  hoistIntl:
    "Intl formatters are expensive to construct — hoist to module scope (static locale/options) or wrap in useMemo keyed on the locale.",
  zustandBare:
    "Pass a selector to the Zustand store hook, for example `useSettingsStore(state => state.theme)`. Bare store subscriptions re-render for every store change; use `.getState()` for an imperative read.",
  zustandUndefined:
    "Passing `undefined` still subscribes to the entire Zustand store. Pass a selector such as `state => state.theme`, or use `.getState()` for an imperative read.",
  componentsTsxOnly:
    "components/ holds components and a barrel, nothing else, and this file renders no JSX. Move it to src/utils (helpers, pure logic), src/hooks (a hook), or src/api/<feature>/ (data access).",
};

const I18N_COMPONENTS = new Set(["Trans", "Plural", "Select"]);
const NATIVE_TRANSLATABLE_ATTRIBUTES = ["placeholder", "accessibilityLabel", "accessibilityHint", "title"];
const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);
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
const STORE_MODULE = /^(?:@\/stores\/|(?:\.\.?\/)+stores\/)[^"']*-store$/;
const STORE_HOOK = /^use[A-Za-z0-9_$]*Store$/;
const BARE_TEXT = /^[A-Za-z][^<{}]{2,}$/;
const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);
const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const isZodCall = (node, method) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "z" &&
  node.callee.property?.name === method;

const isStringLiteralCall = node =>
  isZodCall(node, "literal") &&
  node.arguments?.length === 1 &&
  node.arguments[0]?.type === "Literal" &&
  typeof node.arguments[0].value === "string";

const preferZodEnum = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (isZodCall(node, "nativeEnum")) {
          context.report({ node, message: MESSAGES.nativeEnum });
          return;
        }
        if (!isZodCall(node, "union")) return;
        const members = node.arguments?.[0];
        if (members?.type !== "ArrayExpression") return;
        const elements = members.elements ?? [];
        if (elements.length === 0 || !elements.every(isStringLiteralCall)) return;
        context.report({ node, message: MESSAGES.literalUnion });
      },
    };
  },
};

const noBareJsxText = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXElement(node) {
        if ((node.openingElement?.attributes ?? []).length > 0) return;
        const children = (node.children ?? []).filter(
          child => child.type !== "JSXText" || (child.value ?? "").trim() !== ""
        );
        if (children.length !== 1) return;
        const only = children[0];
        if (only.type !== "JSXText") return;
        if (!BARE_TEXT.test((only.value ?? "").trim())) return;
        if (I18N_COMPONENTS.has(tagIdentifier(node.openingElement?.name))) return;
        context.report({ node: only, message: MESSAGES.bareJsxText });
      },
    };
  },
};

const noBareJsxAttrs = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { attributes: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    const attributes = new Set();
    return {
      before() {
        attributes.clear();
        for (const attribute of context.options?.[0]?.attributes ?? NATIVE_TRANSLATABLE_ATTRIBUTES) {
          attributes.add(attribute);
        }
      },
      JSXAttribute(node) {
        if (!attributes.has(node.name?.name ?? "")) return;
        const value = node.value;
        if (value?.type !== "Literal" || typeof value.value !== "string" || value.value.length === 0) return;
        context.report({ node, message: MESSAGES.bareJsxAttribute });
      },
    };
  },
};

const noBareToast = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type !== "MemberExpression") return;
        if (callee.object?.type !== "Identifier" || callee.object.name !== "toast") return;
        if (!TOAST_METHODS.has(callee.property?.name ?? "")) return;
        if ((node.arguments ?? []).length !== 1) return;
        const argument = node.arguments?.[0];
        if (argument?.type !== "Literal" || typeof argument.value !== "string") return;
        context.report({ node: argument, message: MESSAGES.bareToast });
      },
    };
  },
};

const noDeprecatedTanstackQueryFilters = {
  meta: { type: "problem", hasSuggestions: true },
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

const noInlineTanstackQueryKeys = {
  meta: { type: "problem" },
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

const requireDestructuredQueryHooks = {
  meta: { type: "problem" },
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

const COMMENT_DIRECTIVES = [
  "@ts-expect-error",
  "@ts-ignore",
  "@ts-nocheck",
  "@ts-check",
  "@jsx",
  "@jsxRuntime",
  "@jsxImportSource",
  "prettier-ignore",
  "eslint-disable",
  "eslint-enable",
  "oxlint-disable",
  "oxlint-enable",
  "oxfmt-ignore",
  "react-doctor-disable",
  "@type",
  "<reference",
  "#__PURE__",
  "@__PURE__",
  "v8 ignore",
  "c8 ignore",
  "istanbul ignore",
  "@vitest-environment",
  "EXPECT_PASS",
  "EXPECT_FAIL",
];

const LAZY_WRAPPERS = new Set(["lazy", "dynamic"]);

const propertyKeyName = node =>
  node.key?.type === "Identifier" ? node.key.name : node.key?.type === "Literal" ? String(node.key.value) : "";

const BARE_FETCH = /\bfetch\s*\(/;
const RETURNS_NULL = /\breturn\s+null\b/;
const QUERY_FN_KEYS = new Set(["queryFn", "mutationFn"]);

const DATA_MESSAGES = {
  fetchInQueryFn:
    "Call a typed function from the feature's requests module instead. A bare fetch here skips the shared client, so it sends no auth header, applies no timeout, never retries a 429 or a 5xx, and throws a raw Response rather than the app's error type.",
  dynamicImport:
    "Import this at the top of the file. A dynamic import() buys no laziness here - Metro inlines it into the same bundle - so all it costs is a module the typechecker cannot follow and a path nothing resolves on a rename. React.lazy(() => import(...)) is exempt, since deferring the component is the point there.",
  nextPageParamNull:
    "Return undefined to mean there are no more pages. null is a valid page param, so returning it tells the query the next cursor is null and the list keeps fetching forever.",
};

const ESCAPE_HATCH = /^what:\s*(?<fact>.+)$/i;
const HATCH_MIN_FACT = 10;
const HATCH_MAX_LENGTH = 120;
const HATCH_DEFAULT_BUDGET = 2;
const BLOCK_COMMENT_TYPES = new Set(["Block", "MultiLine"]);
const IGNORED_COMMENT_TYPES = new Set(["Shebang", "Hashbang"]);

const HATCH_MESSAGES = {
  refactorFirst:
    "Delete this comment and make the code say it: rename the value so it states its own meaning, extract a named function, and simplify the logic and the control flow until someone tracing it by eye needs no prose to follow it. Explaining unclear code is not a fix, rewriting it is. Only when the fact cannot live in code at all — a platform bug, an ordering constraint, a value measured outside this codebase — keep exactly ONE line as `// what: <fact>`.",
  block:
    "`what:` has to be a single `//` line, not a block comment. A fact that fills a paragraph is a design that needs simplifying: name the pieces so the paragraph has nothing left to say.",
  multiline:
    "`what:` has to fit on one line. Refactor until the rest is unnecessary rather than wrapping the explanation onto another line.",
  shortFact: "`what:` needs an actual fact after it.",
  tooLong: `Keep the whole \`what:\` line under ${HATCH_MAX_LENGTH} characters. Past that it is prose, and prose belongs in code that reads without it.`,
  stacked:
    "Consecutive `what:` lines are a paragraph in disguise. Keep the one irreducible fact and refactor whatever the others were explaining into names.",
};

const commentBody = comment =>
  (BLOCK_COMMENT_TYPES.has(comment.type) ? comment.value.replace(/^[*\s]+/, "") : comment.value).trim();

const isDirective = body => COMMENT_DIRECTIVES.some(prefix => body.startsWith(prefix));

const eachComment = (context, visit) => ({
  "Program:exit"() {
    const comments = context.sourceCode?.getAllComments?.() ?? [];
    if (comments.length === 0) return;
    for (const comment of comments) {
      if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
      const body = commentBody(comment);
      if (isDirective(body)) continue;
      visit(comment, body, body.match(ESCAPE_HATCH)?.groups?.fact);
    }
  },
});

const noFetchInQueryFn = {
  meta: { type: "problem" },
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
  meta: { type: "problem" },
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

const noDynamicImport = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return context.sourceCode?.getText?.()?.includes("import(") !== false;
      },
      ImportExpression(node) {
        if (hasAncestor(node, current => current.type === "CallExpression" && LAZY_WRAPPERS.has(calleeName(current)))) {
          return;
        }
        context.report({ node, message: DATA_MESSAGES.dynamicImport });
      },
    };
  },
};

const noComments = {
  meta: { type: "problem" },
  createOnce(context) {
    return eachComment(context, (comment, _body, fact) => {
      if (fact === undefined) context.report({ node: comment, message: HATCH_MESSAGES.refactorFirst });
    });
  },
};

const commentEscapeHatch = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { budget: { type: "integer", minimum: 0 } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    return {
      "Program:exit"() {
        const comments = context.sourceCode?.getAllComments?.() ?? [];
        if (comments.length === 0) return;

        const budget = context.options?.[0]?.budget ?? HATCH_DEFAULT_BUDGET;
        const source = context.sourceCode.getText();
        const accepted = [];

        for (const comment of comments) {
          if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
          const body = commentBody(comment);
          if (isDirective(body)) continue;

          const fact = body.match(ESCAPE_HATCH)?.groups?.fact;
          if (fact === undefined) continue;

          if (BLOCK_COMMENT_TYPES.has(comment.type)) {
            context.report({ node: comment, message: HATCH_MESSAGES.block });
          } else if (/[\n\r]/.test(comment.value)) {
            context.report({ node: comment, message: HATCH_MESSAGES.multiline });
          } else if (fact.trim().length < HATCH_MIN_FACT) {
            context.report({ node: comment, message: HATCH_MESSAGES.shortFact });
          } else if (body.length > HATCH_MAX_LENGTH) {
            context.report({ node: comment, message: HATCH_MESSAGES.tooLong });
          } else {
            accepted.push(comment);
          }
        }

        for (const [index, comment] of accepted.entries()) {
          const previous = accepted[index - 1];
          if (previous && source.slice(previous.end, comment.start).trim() === "") {
            context.report({ node: comment, message: HATCH_MESSAGES.stacked });
          }
        }

        if (accepted.length > budget) {
          context.report({
            node: accepted[budget],
            message: `${accepted.length} \`what:\` comments in this file and the budget is ${budget}. Each one past the budget is a refactor that was skipped: move the annotated logic into functions whose names carry what these lines are saying, then delete them.`,
          });
        }
      },
    };
  },
};

const requireZustandSelector = {
  meta: { type: "problem" },
  createOnce(context) {
    const hooks = new Set();
    const calls = [];
    return {
      before() {
        hooks.clear();
        calls.length = 0;
      },
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string" || !STORE_MODULE.test(source)) return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported?.name ?? "";
          const local = specifier.local?.name ?? "";
          if (STORE_HOOK.test(imported) || STORE_HOOK.test(local)) hooks.add(local);
        }
      },
      CallExpression(node) {
        if (node.callee?.type !== "Identifier") return;
        const name = node.callee.name;
        if (!hooks.has(name) && !STORE_HOOK.test(name)) return;
        const args = node.arguments ?? [];
        if (args.length === 0) {
          calls.push({ node, name, bare: true });
          return;
        }
        if (args.length === 1 && args[0]?.type === "Identifier" && args[0].name === "undefined") {
          calls.push({ node, name, bare: false });
        }
      },
      "Program:exit"() {
        for (const call of calls) {
          if (!hooks.has(call.name)) continue;
          context.report({
            node: call.node,
            message: call.bare ? MESSAGES.zustandBare : MESSAGES.zustandUndefined,
          });
        }
      },
    };
  },
};

const hoistIntl = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      NewExpression(node) {
        const callee = node.callee;
        if (callee?.type !== "MemberExpression") return;
        if (callee.object?.type !== "Identifier" || callee.object.name !== "Intl") return;
        if (hasAncestor(node, current => current.type === "CallExpression" && MEMO_HOOKS.has(calleeName(current)))) {
          return;
        }
        const enclosing = closestAncestor(node, FUNCTION_TYPES);
        if (!enclosing) return;
        const rendersJsx = subtreeHas(
          enclosing,
          current => current.type === "JSXElement" || current.type === "JSXFragment"
        );
        if (!rendersJsx) return;
        context.report({ node, message: MESSAGES.hoistIntl });
      },
    };
  },
};

const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const NUMBERABLE_CAPITAL = /^[A-Z][0-9]*$/;
const CONSTANT_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const PLACEHOLDER_NAME = /^_+$/;

const FORMAT_TESTS = {
  camelCase: name => CAMEL_CASE.test(name),
  PascalCase: name => PASCAL_CASE.test(name) && (/[a-z]/.test(name) || NUMBERABLE_CAPITAL.test(name)),
  CONSTANT_CASE: name => CONSTANT_CASE.test(name),
  snake_case: name => SNAKE_CASE.test(name),
};

const ANY_CASE = ["camelCase", "snake_case", "CONSTANT_CASE", "PascalCase"];

const CONVENTIONS = {
  objectLiteralMember: {
    match:
      /^(?:enableFullScreenImage_legacy|experimental_backgroundImage|unstable_conditionNames|(?:[0-9.]+)|[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ANY_CASE,
    label: "object property",
  },
  typeMember: {
    match: /^(?:[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ANY_CASE,
    label: "type member",
  },
  variable: {
    // trailing $ is the Legend State observable suffix — state/naming REQUIRES it
    match: /^(?:unstable_settings|[$_]*([A-Za-z](?:[A-Za-z0-9_]*[A-Za-z0-9])?)_*\$?)$/,
    formats: ["camelCase", "CONSTANT_CASE", "PascalCase"],
    label: "variable",
  },
  enumMember: {
    match: null,
    formats: ["CONSTANT_CASE", "PascalCase"],
    label: "enum member",
  },
};

const memberName = key => {
  if (!key) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type !== "Literal") return null;
  if (typeof key.value === "string") return IDENTIFIER_NAME.test(key.value) ? key.value : null;
  if (typeof key.value === "number") return key.raw ?? String(key.value);
  return null;
};

const namingViolation = (name, kind) => {
  const convention = CONVENTIONS[kind];
  const wrongFormat = `${convention.label} "${name}" should be one of: ${convention.formats.join(", ")}.`;
  if (convention.match === null) {
    return convention.formats.some(format => FORMAT_TESTS[format](name)) ? null : wrongFormat;
  }
  const matched = convention.match.exec(name);
  if (!matched) return `${convention.label} "${name}" is not an allowed name shape.`;
  const captured = matched[1];
  if (!captured) return null;
  return convention.formats.some(format => FORMAT_TESTS[format](captured)) ? null : wrongFormat;
};

const noNamingConvention = {
  meta: { type: "problem" },
  createOnce(context) {
    const check = (node, name, kind) => {
      if (name === null) return;
      const message = namingViolation(name, kind);
      if (message !== null) context.report({ node, message });
    };

    const checkBinding = (node, shorthand) => {
      if (!node) return;
      switch (node.type) {
        case "Identifier":
          if (shorthand || PLACEHOLDER_NAME.test(node.name)) return;
          check(node, node.name, "variable");
          return;
        case "AssignmentPattern":
          checkBinding(node.left, shorthand);
          return;
        case "RestElement":
          checkBinding(node.argument, false);
          return;
        case "ArrayPattern":
          for (const element of node.elements ?? []) checkBinding(element, false);
          return;
        case "ObjectPattern":
          for (const property of node.properties ?? []) {
            if (property.type === "RestElement") checkBinding(property.argument, false);
            else checkBinding(property.value, property.shorthand === true);
          }
          return;
        default:
      }
    };

    return {
      VariableDeclarator(node) {
        checkBinding(node.id, false);
      },
      Property(node) {
        if (node.computed === true || node.parent?.type === "ObjectPattern") return;
        check(node.key, memberName(node.key), "objectLiteralMember");
      },
      TSPropertySignature(node) {
        if (node.computed === true) return;
        check(node.key, memberName(node.key), "typeMember");
      },
      TSMethodSignature(node) {
        if (node.computed === true) return;
        check(node.key, memberName(node.key), "typeMember");
      },
      TSEnumMember(node) {
        check(node.id, memberName(node.id), "enumMember");
      },
    };
  },
};

// The design system is whatever sits in the UI directory, read from disk rather
// than listed in config. A list would need editing every time a primitive is
// added, and the failure mode of forgetting is a rule that quietly protects less
// than it appears to.
const DESIGN_SYSTEM_DIR = "src/components/ui";
const DESIGN_SYSTEM_ALIAS = "@/components/ui";
const PLATFORM_SUFFIX = /\.(?:ios|android|native|web)$/;

// A primitive named X also covers the older React Native ways of doing X.
const ALSO_COVERS = {
  Pressable: ["TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback", "TouchableNativeFeedback"],
};

const toPascalCase = name =>
  name
    .split("-")
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join("");

const readDesignSystem = (dir, alias) => {
  const banned = new Map();

  let files;
  try {
    files = readdirSync(isAbsolute(dir) ? dir : join(process.cwd(), dir));
  } catch {
    return banned;
  }

  for (const file of files) {
    if (!file.endsWith(".tsx")) continue;

    const base = file.slice(0, -4).replace(PLATFORM_SUFFIX, "");
    if (base === "index") continue;

    const name = toPascalCase(base);
    const from = `${alias}/${base}`;

    banned.set(name, { name, from });
    for (const alternative of ALSO_COVERS[name] ?? []) banned.set(alternative, { name, from });
  }

  return banned;
};

const designSystems = new Map();

const designSystemFor = (dir, alias) => {
  const cacheKey = `${dir} ${alias}`;
  let banned = designSystems.get(cacheKey);
  if (banned === undefined) {
    banned = readDesignSystem(dir, alias);
    designSystems.set(cacheKey, banned);
  }
  return banned;
};

const useDesignSystem = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { dir: { type: "string" }, alias: { type: "string" } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    let banned = new Map();
    return {
      before() {
        const options = context.options?.[0] ?? {};
        banned = designSystemFor(options.dir ?? DESIGN_SYSTEM_DIR, options.alias ?? DESIGN_SYSTEM_ALIAS);
        return banned.size > 0;
      },
      ImportDeclaration(node) {
        if (node.source?.value !== "react-native") return;

        for (const specifier of node.specifiers ?? []) {
          if (specifier.type !== "ImportSpecifier") continue;

          const imported = specifier.imported?.name;
          const replacement = imported === undefined ? undefined : banned.get(imported);
          if (replacement === undefined) continue;

          context.report({
            node: specifier,
            message: `This project has its own ${replacement.name}. Import it from "${replacement.from}" instead of taking ${imported} from react-native. The wrapper is where the theme colours, the typography tokens and the font-scaling cap live, so the raw one renders unthemed and drifts from every screen around it.`,
          });
        }
      },
    };
  },
};

const isBarrel = program =>
  (program.body ?? []).every(
    statement =>
      statement.type === "ImportDeclaration" ||
      statement.type === "ExportAllDeclaration" ||
      (statement.type === "ExportNamedDeclaration" && statement.declaration == null)
  );

// Scope this with an override on the components glob. It fires on a file that
// renders no JSX and is not a barrel, so a component file is never flagged even
// when the rule is left on everywhere.
const componentsTsxOnly = {
  meta: { type: "problem" },
  createOnce(context) {
    let sawJsx = false;
    return {
      before() {
        sawJsx = false;
      },
      JSXElement() {
        sawJsx = true;
      },
      JSXFragment() {
        sawJsx = true;
      },
      "Program:exit"(node) {
        if (sawJsx || isBarrel(node)) return;
        context.report({ node, message: MESSAGES.componentsTsxOnly });
      },
    };
  },
};

export default {
  meta: { name: "shared" },
  rules: {
    "prefer-zod-enum": preferZodEnum,
    "no-bare-jsx-text": noBareJsxText,
    "no-bare-jsx-attrs": noBareJsxAttrs,
    "no-bare-toast": noBareToast,
    "no-deprecated-tanstack-query-filters": noDeprecatedTanstackQueryFilters,
    "no-inline-tanstack-query-keys": noInlineTanstackQueryKeys,
    "require-destructured-query-hooks": requireDestructuredQueryHooks,
    "no-fetch-in-query-fn": noFetchInQueryFn,
    "next-page-param-undefined": nextPageParamUndefined,
    "no-dynamic-import": noDynamicImport,
    "no-comments": noComments,
    "comment-escape-hatch": commentEscapeHatch,
    "require-zustand-selector": requireZustandSelector,
    "hoist-intl": hoistIntl,
    "no-naming-convention": noNamingConvention,
    "use-design-system": useDesignSystem,
    "components-tsx-only": componentsTsxOnly,
  },
};
