import { enclosingComponentOrHook, gate, importedNames, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";

const DROPPED_DISPOSE =
  "Use `useObserve` here, which disposes on unmount, or keep the function `observe` returns and call it in a cleanup. Dropped, each run starts another observer that nothing ever stops.";

export const disposeObserve: Rule = problem(
  "Disallow an `observe(...)` statement inside a component or hook that drops the dispose function it returns. Each run starts an observer nothing ever stops.",
  {
    createOnce(context) {
      const observeNames = new Set<string>();
      return {
        before() {
          observeNames.clear();
          return gate(context, "observe");
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedNames(node, "@legendapp/state")) {
            if (imported === "observe") observeNames.add(local);
          }
        },
        ExpressionStatement(node) {
          const { expression } = node;
          if (expression.type !== "CallExpression" || expression.callee.type !== "Identifier") return;
          if (!observeNames.has(expression.callee.name) || enclosingComponentOrHook(node) === null) return;
          context.report({ node: expression, message: DROPPED_DISPOSE });
        },
      };
    },
  }
);
