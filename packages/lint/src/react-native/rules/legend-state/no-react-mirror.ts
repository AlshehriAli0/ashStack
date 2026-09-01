import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef } from "./shared.js";

const OBSERVABLE_READS = new Set(["get", "peek"]);

const readsObservable = (node: AstNode | undefined): boolean => {
  if (node?.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  if (callee.property.type !== "Identifier" || !OBSERVABLE_READS.has(callee.property.name)) return false;
  return isObservableRef(callee.object);
};

export const noReactMirror: Rule = problem(
  "Seeding `useState` from an observable's `get()` or `peek()` gives the value two owners. Read it with `useValue(...)` where it renders.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, "useState");
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "Identifier" || callee.name !== "useState") return;
          if (!readsObservable(node.arguments[0])) return;
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
