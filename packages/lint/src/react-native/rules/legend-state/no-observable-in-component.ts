import { COMPONENT_OR_HOOK, gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { GateContext } from "./shared.js";

export const noObservableInComponent: Rule = problem(
  "Calling `observable()` inside a component or hook makes a new observable on every render. Use `useObservable()` or a module-level store instead.",
  {
    createOnce(context: GateContext) {
      let componentDepth = 0;
      const enter = (name: unknown): void => {
        if (typeof name === "string" && COMPONENT_OR_HOOK.test(name)) componentDepth++;
      };
      const exit = (name: unknown): void => {
        if (typeof name === "string" && COMPONENT_OR_HOOK.test(name)) componentDepth--;
      };

      return {
        before() {
          componentDepth = 0;
          return gate(context, "observable(");
        },
        FunctionDeclaration(node) {
          enter((node.id as AstNode | undefined)?.name);
        },
        "FunctionDeclaration:exit"(node) {
          exit((node.id as AstNode | undefined)?.name);
        },
        VariableDeclarator(node) {
          if (isFunction(node.init as AstNode | undefined)) enter((node.id as AstNode | undefined)?.name);
        },
        "VariableDeclarator:exit"(node) {
          if (isFunction(node.init as AstNode | undefined)) exit((node.id as AstNode | undefined)?.name);
        },

        CallExpression(node) {
          if (componentDepth === 0) return;
          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "Identifier" || callee.name !== "observable") return;

          context.report({
            node,
            message:
              "Use `useObservable()` for component-lifetime state, or move this observable into a store in `src/stores` and import it. `observable()` inside a component makes a new observable every render, so nothing that read the previous one is listening.",
          });
        },
      };
    },
  }
);
