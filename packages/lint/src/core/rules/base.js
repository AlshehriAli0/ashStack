// @ashstack/lint — ash oxlint JS plugin. Rules that apply to any file in the
// stack: comments, naming, dynamic imports and project structure.
import { readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { calleeName, closestAncestor, hasAncestor, subtreeHas } from "../../lib/ast.js";

const MESSAGES = {
  hoistIntl:
    "Move this `Intl` formatter to module scope when the locale and options are static, or wrap it in `useMemo` keyed on the locale — constructing one per render is expensive.",
  componentsTsxOnly:
    "Move this file to `src/utils` (helpers, pure logic), `src/hooks` (a hook), or `src/api/<feature>/` (data access). `components/` holds only files that render JSX, plus a barrel.",
};

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);
const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

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

const DATA_MESSAGES = {
  dynamicImport:
    "Turn this into a static `import` at the top of the file. Metro inlines `import()` into the same bundle, so it buys no laziness and only hides the module from the typechecker; wrapping it in `React.lazy(() => import(...))` or `dynamic(() => import(...))` stays allowed.",
};

const ESCAPE_HATCH = /^what:\s*(?<fact>.+)$/i;
const HATCH_MIN_FACT = 10;
const HATCH_MAX_LENGTH = 120;
const HATCH_DEFAULT_BUDGET = 2;
const BLOCK_COMMENT_TYPES = new Set(["Block", "MultiLine"]);
const IGNORED_COMMENT_TYPES = new Set(["Shebang", "Hashbang"]);

const HATCH_MESSAGES = {
  refactorFirst:
    "Delete this comment and let the code say it: rename the value to state its own meaning, extract a named function, and flatten the control flow until it reads without prose. Keep exactly one `// what: <fact>` line only when the fact cannot live in code at all — a platform bug, an ordering constraint, a value measured outside this codebase.",
  block:
    "Rewrite this as a single `// what: <fact>` line comment. If the fact needs a paragraph, name the pieces in code until it fits on one line.",
  multiline: `Fit this \`what:\` on one \`//\` line under ${HATCH_MAX_LENGTH} characters, and move whatever spills over into names in the code.`,
  shortFact: `Write the fact after \`what:\` (at least ${HATCH_MIN_FACT} characters), or delete the comment.`,
  tooLong: `Trim this \`what:\` line under ${HATCH_MAX_LENGTH} characters, moving what is left into names in the code.`,
  stacked:
    "Keep one `what:` line here — the single irreducible fact — and refactor what the others explain into named values and functions.",
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

const noDynamicImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow dynamic `import()` outside a React.lazy/dynamic wrapper; Metro inlines it into the same bundle, so it buys no laziness and only hides the module from the typechecker.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explanatory comments; prose about unclear code is a refactor that was skipped, so rename, extract and simplify until only a single `// what: <fact>` line is left.",
    },
  },
  createOnce(context) {
    return eachComment(context, (comment, _body, fact) => {
      if (fact === undefined) context.report({ node: comment, message: HATCH_MESSAGES.refactorFirst });
    });
  },
};

const commentEscapeHatch = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce the shape and the per-file budget of `// what:` escape-hatch comments — one short line each, never blocks, never stacked — because every one past the budget is a refactor that was skipped.",
    },
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
            message: `Delete \`what:\` comments from this file until at most ${budget} remain (it has ${accepted.length}): move the logic each one annotates into a function whose name carries what the comment says.`,
          });
        }
      },
    };
  },
};

const hoistIntl = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow constructing an `Intl` formatter inside a function that renders JSX; the constructor is expensive, so hoist it to module scope or wrap it in useMemo keyed on the locale.",
    },
  },
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
  const wrongFormat = `Rename this ${convention.label} \`${name}\` to ${convention.formats.join(", ")}.`;
  if (convention.match === null) {
    return convention.formats.some(format => FORMAT_TESTS[format](name)) ? null : wrongFormat;
  }
  const matched = convention.match.exec(name);
  if (!matched) {
    return `Rename this ${convention.label} \`${name}\` to a plain ${convention.formats.join("/")} identifier, with at most a leading \`_\` or a trailing \`$\`.`;
  }
  const captured = matched[1];
  if (!captured) return null;
  return convention.formats.some(format => FORMAT_TESTS[format](captured)) ? null : wrongFormat;
};

const noNamingConvention = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce the allowed name shapes and casing for variables, object properties, type members and enum members, so a name never has to be read twice to tell what kind of thing it is.",
    },
  },
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
  const cacheKey = `${dir} ${alias}`;
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
    docs: {
      description:
        "Disallow importing a react-native primitive the project's own design system already wraps; the wrapper is where the theme colours, the typography tokens and the font-scaling cap live.",
    },
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
            message: `Import \`${replacement.name}\` from "${replacement.from}" instead of \`${imported}\` from react-native. That wrapper carries the theme colours, the typography tokens and the font-scaling cap, so the raw primitive renders unthemed.`,
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every file in components/ to render JSX or be a barrel; helpers, hooks and data access belong in utils, hooks or api instead.",
    },
  },
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
  meta: { name: "@ashstack/core" },
  rules: {
    "no-comments": noComments,
    "comment-escape-hatch": commentEscapeHatch,
    "no-dynamic-import": noDynamicImport,
    "no-naming-convention": noNamingConvention,
    "use-design-system": useDesignSystem,
    "components-tsx-only": componentsTsxOnly,
    "hoist-intl": hoistIntl,
  },
};
