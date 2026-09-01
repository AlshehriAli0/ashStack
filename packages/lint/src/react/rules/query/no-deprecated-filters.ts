import type { AstNode, Rule } from "../../../lib/types.js";
import type { SourceContext } from "./shared.js";

const DEPRECATED_FILTERS =
  "Pass a filter object here: `.invalidateQueries({ queryKey: someKeys.scope(...) })`. TanStack Query v5 removed the positional `(queryKey)` form.";

const FILTER_METHODS = new Set([
  "invalidateQueries",
  "removeQueries",
  "refetchQueries",
  "cancelQueries",
  "resetQueries",
]);

interface Fixer {
  replaceText(node: AstNode, text: string): unknown;
}

type FilterContext = SourceContext & { getSourceCode?: () => SourceContext["sourceCode"] };

const isFilterMethodCall = (node: AstNode): boolean => {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return false;
  const method = ((callee.property as AstNode | undefined)?.name as string | undefined) ?? "";
  return FILTER_METHODS.has(method);
};

const onlyArgument = (node: AstNode): AstNode | undefined => {
  const args = (node.arguments as AstNode[] | undefined) ?? [];
  if (args.length !== 1) return undefined;
  return args[0] as AstNode | undefined;
};

const isStringLiteral = (node: AstNode): boolean => node.type === "Literal" && typeof node.value === "string";

const textOf = (context: FilterContext, node: AstNode): string => {
  const source = context.sourceCode ?? context.getSourceCode?.();
  return source?.getText?.(node) ?? "";
};

const filterObjectFor = (context: FilterContext, argument: AstNode): string | null => {
  if (argument.type === "ArrayExpression") return `{ queryKey: ${textOf(context, argument)} }`;
  if (isStringLiteral(argument)) return `{ queryKey: [${textOf(context, argument)}] }`;
  return null;
};

export const noDeprecatedFilters: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Catches the positional key argument that TanStack Query v5 removed from `invalidateQueries` and its sibling methods. Suggests the filter-object form.",
    },
    hasSuggestions: true,
  },
  createOnce(context: FilterContext) {
    return {
      CallExpression(node: AstNode) {
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
              fix: (fixer: Fixer) => fixer.replaceText(argument, filterObject),
            },
          ],
        });
      },
    };
  },
};
