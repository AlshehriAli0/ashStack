import { gate, isFunction, problem, propertyValue, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { optionsArgument, QUERY_OPTIONS_CALLS, queryFunctions } from "./shared.js";

/** The array a `queryKey` is, seen through `as const` and `satisfies`; `null` when it is not an array literal. */
const keyArray = (node: AstNode | null): AstNode | null => {
  let current = node;
  while (current?.type === "TSAsExpression" || current?.type === "TSSatisfiesExpression") current = current.expression;
  return current?.type === "ArrayExpression" ? current : null;
};

/** Whether `identifier` is a call's callee, or the object one hangs off: `load()`, `api.get()`. */
const isCalled = (identifier: AstNode): boolean => {
  let current = identifier;
  while (current.parent?.type === "MemberExpression" && current.parent.object === current) current = current.parent;
  return current.parent?.type === "CallExpression" && current.parent.callee === current;
};

/** A type name: `Post` in `get<Post>(id)` is checked by the compiler, not keyed. */
const isTypeName = (identifier: AstNode): boolean =>
  identifier.parent?.type === "TSTypeReference" || identifier.parent?.type === "TSQualifiedName";

/** A function can never be part of a key: it does not survive `JSON.stringify`. */
const holdsFunction = (variable: { defs: { node: AstNode }[] }): boolean =>
  variable.defs.some(
    ({ node }) => node.type === "FunctionDeclaration" || (node.type === "VariableDeclarator" && isFunction(node.init))
  );

/** Values `fn` reads from the function around it: not module scope, not an import, not a function or a type. */
const closedOverNames = (context: RuleContext, fn: AstNode): Set<string> => {
  const names = new Set<string>();
  for (const reference of context.sourceCode.getScope(fn).through) {
    const variable = reference.resolved;
    if (variable?.scope.variableScope.type !== "function" || holdsFunction(variable)) continue;
    const { identifier } = reference;
    if (!reference.isRead() || isCalled(identifier) || isTypeName(identifier)) continue;
    names.add(identifier.name);
  }
  return names;
};

const named = (name: string) => (node: AstNode) => node.type === "Identifier" && node.name === name;

export const exhaustiveKey: Rule = problem(
  "Require every value a `queryFn` reads from the function around it in that query's `queryKey` array. The cache keeps one entry per key, so a value left out shares one result across all of its values and never triggers a refetch.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "queryKey");
        },
        CallExpression(node) {
          const options = optionsArgument(node, QUERY_OPTIONS_CALLS);
          const key = keyArray(propertyValue(options, "queryKey"));
          if (key === null) return;
          const missing = new Set<string>();
          for (const fn of queryFunctions(propertyValue(options, "queryFn"))) {
            for (const name of closedOverNames(context, fn)) {
              if (!subtreeHas(key, named(name))) missing.add(name);
            }
          }
          for (const name of missing) {
            context.report({
              node: key,
              message: `Add \`${name}\` to this \`queryKey\`; the \`queryFn\` reads it. The cache keeps one entry per key, so without it every \`${name}\` shares one result and changing it never refetches.`,
            });
          }
        },
      };
    },
  }
);
