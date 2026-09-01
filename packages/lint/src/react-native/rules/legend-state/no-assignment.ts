import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { isObservableRef, textOf } from "./shared.js";

export const noAssignment: Rule = problem(
  "Write an observable with `.set(...)` or `.assign({...})`. Assigning or incrementing it with an operator is a silent no-op.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, "$");
        },
        AssignmentExpression(node) {
          const { left } = node;
          if (!isObservableRef(left)) return;
          const target = textOf(context, left);
          context.report({
            node,
            message: `Write through \`${target}.set(...)\`, or \`.assign({...})\` to merge several fields. Assigning to an observable with \`=\` is a silent no-op, so the value never changes.`,
          });
        },
        UpdateExpression(node) {
          const { argument, operator } = node;
          if (!isObservableRef(argument)) return;
          const target = textOf(context, argument);
          context.report({
            node,
            message: `Use \`${target}.set(v => v ${operator[0]} 1)\` — \`${operator}\` on an observable is a silent no-op.`,
          });
        },
      };
    },
  }
);
