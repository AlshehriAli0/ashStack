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
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== "MemberExpression") return;
        if (!FILTER_METHODS.has(((callee.property as AstNode | undefined)?.name as string | undefined) ?? "")) return;
        const args = (node.arguments as AstNode[] | undefined) ?? [];
        const argument = args[0];
        if (!argument || args.length !== 1) return;
        const source = context.sourceCode ?? context.getSourceCode?.();
        if (argument.type === "ArrayExpression") {
          const text = source?.getText?.(argument) ?? "";
          context.report({
            node: argument,
            message: DEPRECATED_FILTERS,
            suggest: [
              {
                desc: "Wrap in a filter object",
                fix: (fixer: Fixer) => fixer.replaceText(argument, `{ queryKey: ${text} }`),
              },
            ],
          });
          return;
        }
        if (argument.type === "Literal" && typeof argument.value === "string") {
          const text = source?.getText?.(argument) ?? "";
          context.report({
            node: argument,
            message: DEPRECATED_FILTERS,
            suggest: [
              {
                desc: "Wrap in a filter object",
                fix: (fixer: Fixer) => fixer.replaceText(argument, `{ queryKey: [${text}] }`),
              },
            ],
          });
        }
      },
    };
  },
};
