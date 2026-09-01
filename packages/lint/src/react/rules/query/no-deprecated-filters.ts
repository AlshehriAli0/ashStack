import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DEPRECATED_FILTERS =
  "Pass a filter object here: `.invalidateQueries({ queryKey: someKeys.scope(...) })`. TanStack Query v5 removed the positional `(queryKey)` form.";

const FILTER_METHODS = new Set([
  "invalidateQueries",
  "removeQueries",
  "refetchQueries",
  "cancelQueries",
  "resetQueries",
]);

const isFilterMethodCall = (node: AstNode): boolean => {
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  const { property } = callee;
  return property.type === "Identifier" && FILTER_METHODS.has(property.name);
};

const onlyArgument = (node: AstNode): AstNode | undefined => {
  if (node.type !== "CallExpression" || node.arguments.length !== 1) return undefined;
  return node.arguments[0];
};

const isStringLiteral = (node: AstNode): boolean => node.type === "Literal" && typeof node.value === "string";

const filterObjectFor = (context: RuleContext, argument: AstNode): string | null => {
  if (argument.type === "ArrayExpression") return `{ queryKey: ${context.sourceCode.getText(argument)} }`;
  if (isStringLiteral(argument)) return `{ queryKey: [${context.sourceCode.getText(argument)}] }`;
  return null;
};

export const noDeprecatedFilters: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the positional key argument that TanStack Query v5 removed from `invalidateQueries` and its sibling methods. The suggestion rewrites it to the filter-object form.",
    },
    hasSuggestions: true,
  },
  createOnce(context: RuleContext) {
    return {
      CallExpression(node) {
        if (!isFilterMethodCall(node)) return;
        const argument = onlyArgument(node);
        if (argument === undefined) return;
        const filterObject = filterObjectFor(context, argument);
        if (filterObject === null) return;
        context.report({
          node: argument,
          message: DEPRECATED_FILTERS,
          suggest: [
            {
              desc: "Wrap in a filter object",
              fix: fixer => fixer.replaceText(argument, filterObject),
            },
          ],
        });
      },
    };
  },
};
