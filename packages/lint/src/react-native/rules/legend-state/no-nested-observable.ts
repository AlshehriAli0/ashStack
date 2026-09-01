import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { factoryCalled, isObservableRef } from "./shared.js";

export const noNestedObservable: Rule = problem(
  "Never pass an observable to `observable()` or `useObservable()`. The wrapper is a second node, and reads and writes on it never reach the original.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, "observable", "useObservable");
        },
        CallExpression(node) {
          const factory = factoryCalled(node);
          if (!factory) return;
          const argument = node.arguments[0];
          if (!argument || !isObservableRef(argument)) return;
          context.report({
            node: argument,
            message: `Use the existing observable reference directly instead of passing it to \`${factory}()\`; wrapping it creates a second node whose reads and writes never reach the original.`,
          });
        },
      };
    },
  }
);
