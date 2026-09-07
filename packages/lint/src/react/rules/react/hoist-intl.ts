import { ancestors, calleeName, hasAncestor, isFunction, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const HOIST_INTL =
  "Move this `Intl` formatter to module scope when the locale and options are static, or wrap it in `useMemo` keyed on the locale.";

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

const rendersJsx = (node: AstNode): boolean =>
  subtreeHas(node, current => current.type === "JSXElement" || current.type === "JSXFragment");

/** Any enclosing function that renders JSX, not just the innermost one: a callback of a component is rebuilt too. */
const insideAComponent = (node: AstNode): boolean => {
  for (const current of ancestors(node)) {
    if (isFunction(current) && rendersJsx(current)) return true;
  }
  return false;
};

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
          if (!insideAComponent(node)) return;
          context.report({ node, message: HOIST_INTL });
        },
      };
    },
  }
);
