import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf, type GateContext } from "./shared.js";

export const noAssignment: Rule = problem(
  "Write an observable with `.set(...)` or `.assign({...})`. Assigning or incrementing it with an operator is a silent no-op.",
  {
    createOnce(context: GateContext) {
      return {
        before() {
          return gate(context, "$");
        },
        AssignmentExpression(node) {
          const left = node.left as AstNode | undefined;
          if (!isObservableRef(left)) return;
          const target = textOf(context, left) ?? "the observable";
          context.report({
            node,
            message: `Write through \`${target}.set(...)\`, or \`.assign({...})\` to merge several fields. Assigning to an observable with \`=\` is a silent no-op, so the value never changes.`,
          });
        },
        UpdateExpression(node) {
          const argument = node.argument as AstNode | undefined;
          if (!isObservableRef(argument)) return;
          const target = textOf(context, argument) ?? "the observable";
          const operator = node.operator as string;
          context.report({
            node,
            message: `Use \`${target}.set(v => v ${operator[0]} 1)\` — \`${operator}\` on an observable is a silent no-op.`,
          });
        },
      };
    },
  }
);
