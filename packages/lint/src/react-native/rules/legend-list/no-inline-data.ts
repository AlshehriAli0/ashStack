import { FUNCTION_TYPES, calleeName, crossesFunctionBefore, findInSubtree, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { attributeNamed, expressionOf, isListElement, LIST } from "./shared.js";

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

const buildsFreshArray = (node: AstNode): boolean =>
  node.type === "ArrayExpression" || (node.type === "CallExpression" && node.callee.type === "MemberExpression");

export const noInlineData: Rule = problem(
  "Disallow building a Legend List's `data` inline. Each render produces a new array reference, and the list re-diffs, re-keys and drops what it had cached.",
  {
    createOnce: context => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        const data = attributeNamed(node, "data");
        if (!data) return;
        if (MEMO_HOOKS.has(calleeName(expressionOf(data)))) return;
        const built = findInSubtree(data.value, buildsFreshArray);
        if (!built || crossesFunctionBefore(built, data, FUNCTION_TYPES)) return;

        context.report({
          node: data,
          message:
            "Hoist this `data` into a `useMemo` or compute it upstream so its reference is stable. A new array each render makes the list re-diff, re-key and invalidate everything it had cached.",
        });
      },
    }),
  }
);
