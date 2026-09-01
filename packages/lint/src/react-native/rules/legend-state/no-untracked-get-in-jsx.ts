import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf, type GateContext } from "./shared.js";

export const noUntrackedGetInJsx: Rule = problem(
  "A `get()` placed directly in a JSX expression container is a plain read. The value renders once and never updates.",
  {
    createOnce(context: GateContext) {
      let functionDepth = 0;
      let functionDepthAtContainerStart: number[] = [];
      const enterFunction = (): void => {
        functionDepth++;
      };
      const exitFunction = (): void => {
        functionDepth--;
      };
      const directlyInJsxContainer = (): boolean =>
        functionDepthAtContainerStart.length > 0 &&
        functionDepthAtContainerStart[functionDepthAtContainerStart.length - 1] === functionDepth;

      return {
        before() {
          functionDepth = 0;
          functionDepthAtContainerStart = [];
          return gate(context, ".get()");
        },
        FunctionDeclaration: enterFunction,
        "FunctionDeclaration:exit": exitFunction,
        FunctionExpression: enterFunction,
        "FunctionExpression:exit": exitFunction,
        ArrowFunctionExpression: enterFunction,
        "ArrowFunctionExpression:exit": exitFunction,

        JSXExpressionContainer() {
          functionDepthAtContainerStart.push(functionDepth);
        },
        "JSXExpressionContainer:exit"() {
          functionDepthAtContainerStart.pop();
        },

        CallExpression(node) {
          if (!directlyInJsxContainer()) return;

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
