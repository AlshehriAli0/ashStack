import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, type GateContext } from "./shared.js";

const OBSERVABLE_READS = new Set(["get", "peek"]);

const readsObservable = (node: AstNode | undefined): boolean => {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return false;
  if (!OBSERVABLE_READS.has((callee.property as AstNode | undefined)?.name as string)) return false;
  return isObservableRef(callee.object as AstNode | undefined);
};

export const noReactMirror: Rule = problem(
  "Seeding `useState` from an observable's `get()` or `peek()` gives the value two owners. Read it with `useValue(...)` where it renders.",
  {
    createOnce(context: GateContext) {
      return {
        before() {
          return gate(context, "useState");
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "Identifier" || callee.name !== "useState") return;
          const initialState = ((node.arguments as AstNode[] | undefined) ?? [])[0];
          if (!readsObservable(initialState)) return;
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
