import { calleeName, closestAncestor, FUNCTION_TYPES, hasAncestor, problem, subtreeHas } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const HOIST_INTL =
  "Move this `Intl` formatter to module scope when the locale and options are static, or wrap it in `useMemo` keyed on the locale — constructing one per render is expensive.";

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

export const hoistIntl: Rule = problem(
  "Disallow `new Intl.*` inside a function that renders JSX, unless the call already sits in `useMemo` or `useCallback`.",
  {
    createOnce(context: RuleContext) {
      return {
        NewExpression(node) {
          const { callee } = node;
          if (callee.type !== "MemberExpression") return;
          const { object } = callee;
          if (object.type !== "Identifier" || object.name !== "Intl") return;
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
          context.report({ node, message: HOIST_INTL });
        },
      };
    },
  }
);
