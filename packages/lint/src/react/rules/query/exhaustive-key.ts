import { calleeName, gate, isFunction, isWithin, problem, propertyValue } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext, Variable } from "../../../lib/types.js";
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

/** A function, or the client from `useQueryClient()`: neither is ever a key part. */
const isNeverKeyed = (variable: Variable): boolean =>
  variable.defs.some(
    ({ node }) =>
      node.type === "FunctionDeclaration" ||
      (node.type === "VariableDeclarator" && (isFunction(node.init) || calleeName(node.init) === "useQueryClient"))
  );

/** Variables `fn` reads from the function around it: not module scope, not an import, a function or a type. */
const closedOver = (context: RuleContext, fn: AstNode): Set<Variable> => {
  const variables = new Set<Variable>();
  for (const reference of context.sourceCode.getScope(fn).through) {
    const variable = reference.resolved;
    if (variable?.scope.variableScope.type !== "function" || isNeverKeyed(variable)) continue;
    const { identifier } = reference;
    if (reference.isRead() && !isCalled(identifier) && !isTypeName(identifier)) variables.add(variable);
  }
  return variables;
};

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
          const missing = new Set<Variable>();
          for (const fn of queryFunctions(propertyValue(options, "queryFn"))) {
            for (const variable of closedOver(context, fn)) {
              if (!variable.references.some(reference => isWithin(reference.identifier, key))) missing.add(variable);
            }
          }
          for (const { name } of missing) {
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
