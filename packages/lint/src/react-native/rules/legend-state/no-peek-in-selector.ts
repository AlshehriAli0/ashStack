import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { inTrackingContext, isObservableRef, textOf } from "./shared.js";

const peekedObservable = (callee: AstNode): AstNode | null => {
  if (callee.type !== "MemberExpression" || callee.computed) return null;
  if (callee.property.type !== "Identifier" || callee.property.name !== "peek") return null;
  const { object } = callee;
  return isObservableRef(object) ? object : null;
};

export const noPeekInSelector: Rule = problem(
  "`peek()` never subscribes, so a selector or tracking callback that uses it never re-runs. Call `get()` there and keep `peek()` for handlers.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, ".peek()");
        },
        CallExpression(node) {
          const observable = peekedObservable(node.callee);
          if (!observable || !inTrackingContext(node)) return;

          const target = textOf(context, observable);
          context.report({
            node,
            message: `Use \`${target}.get()\` inside this selector and keep \`peek()\` for handlers and async work — \`peek()\` never subscribes, so nothing re-runs.`,
          });
        },
      };
    },
  }
);
