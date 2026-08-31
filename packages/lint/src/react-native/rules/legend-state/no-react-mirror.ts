import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, type GateContext } from "./shared.js";

export const noReactMirror: Rule = problem(
  "Seeding `useState` from an observable's `get()` or `peek()` gives the value two owners. Read it with `useValue(...)` where it renders.",
  {
    createOnce(context: GateContext) {
      return {
        before() {
          return gate(context, "useState");
        },
        CallExpression(node) {
          const outer = node.callee as AstNode | undefined;
          if (outer?.type !== "Identifier" || outer.name !== "useState") return;
          const argument = ((node.arguments as AstNode[] | undefined) ?? [])[0];
          if (argument?.type !== "CallExpression") return;
          const callee = argument.callee as AstNode | undefined;
          if (callee?.type !== "MemberExpression") return;
          const method = (callee.property as AstNode | undefined)?.name;
          if (method !== "get" && method !== "peek") return;
          if (!isObservableRef(callee.object as AstNode | undefined)) return;
          context.report({
            node,
            message:
              "Drop this `useState` mirror and read the observable with `useValue(...)` where it renders, so the observable stays the single owner of the value.",
          });
        },
      };
    },
  }
);
