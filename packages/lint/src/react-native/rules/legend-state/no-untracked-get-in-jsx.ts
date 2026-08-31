// A read in JSX is only tracked when it sits inside a function the reactive
// components call — `<Memo>{() => count$.get()}</Memo>`. Directly in the
// container it is a plain read, so the value renders once and never updates.
import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf, type GateContext } from "./shared.js";

export const noUntrackedGetInJsx: Rule = problem(
  "A `get()` placed directly in a JSX expression container is a plain read. The value renders once and never updates.",
  {
    createOnce(context: GateContext) {
      let fnDepth = 0;
      let containers: number[] = [];
      const enter = (): void => {
        fnDepth++;
      };
      const exit = (): void => {
        fnDepth--;
      };

      return {
        before() {
          fnDepth = 0;
          containers = [];
          return gate(context, ".get()");
        },
        FunctionDeclaration: enter,
        "FunctionDeclaration:exit": exit,
        FunctionExpression: enter,
        "FunctionExpression:exit": exit,
        ArrowFunctionExpression: enter,
        "ArrowFunctionExpression:exit": exit,

        JSXExpressionContainer() {
          containers.push(fnDepth);
        },
        "JSXExpressionContainer:exit"() {
          containers.pop();
        },

        CallExpression(node) {
          if (containers.length === 0) return;
          if (fnDepth !== containers[containers.length - 1]) return;

          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "MemberExpression" || (callee.property as AstNode | undefined)?.name !== "get") return;
          const object = callee.object as AstNode | undefined;
          if (!isObservableRef(object)) return;

          const target = textOf(context, object) ?? "the observable";
          context.report({
            node,
            message: `Read it with \`useValue(${target})\` at the top of the component, or wrap this fragment in \`<Memo>\` so the read happens inside a tracking context. A \`get()\` here is a plain read, so it renders the first value and never updates.`,
          });
        },
      };
    },
  }
);
