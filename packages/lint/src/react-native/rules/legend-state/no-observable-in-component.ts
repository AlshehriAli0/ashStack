import { COMPONENT_OR_HOOK, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";

export const noObservableInComponent: Rule = problem(
  "Calling `observable()` inside a component or hook makes a new observable on every render. Use `useObservable()` or a module-level store instead.",
  {
    createOnce(context) {
      let componentDepth = 0;
      const enter = (name: string | undefined): void => {
        if (name !== undefined && COMPONENT_OR_HOOK.test(name)) componentDepth++;
      };
      const exit = (name: string | undefined): void => {
        if (name !== undefined && COMPONENT_OR_HOOK.test(name)) componentDepth--;
      };
      const declaredName = (id: AstNode | null): string | undefined =>
        id?.type === "Identifier" ? id.name : undefined;

      return {
        before() {
          componentDepth = 0;
          return gate(context, "observable");
        },
        FunctionDeclaration(node) {
          enter(declaredName(node.id));
        },
        "FunctionDeclaration:exit"(node) {
          exit(declaredName(node.id));
        },
        VariableDeclarator(node) {
          if (isFunction(node.init)) enter(declaredName(node.id));
        },
        "VariableDeclarator:exit"(node) {
          if (isFunction(node.init)) exit(declaredName(node.id));
        },

        CallExpression(node) {
          if (componentDepth === 0) return;
          const { callee } = node;
          if (callee.type !== "Identifier" || callee.name !== "observable") return;

          context.report({
            node,
            message:
              "Use `useObservable()` for component-lifetime state, or move this observable into a store in `src/stores` — `observable()` here makes a new one every render.",
          });
        },
      };
    },
  }
);
