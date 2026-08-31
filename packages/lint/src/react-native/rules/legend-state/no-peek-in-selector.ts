// The mirror of no-untracked-get-in-jsx: inside a selector, `peek()` is the one
// read that does not subscribe, so the component never re-renders for it.
import { gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf, type GateContext } from "./shared.js";

// Callbacks passed to these run inside a tracking context, so a `get()` there
// subscribes and a `peek()` there deliberately does not.
const TRACKING_CALLEES = new Set(["useValue", "observe", "useObserve", "useObserveEffect", "when", "whenReady"]);

export const noPeekInSelector: Rule = problem(
  "`peek()` never subscribes, so a selector or tracking callback that uses it never re-runs. Call `get()` there and keep `peek()` for handlers.",
  {
    createOnce(context: GateContext) {
      let selectors = new WeakSet<AstNode>();
      let depth = 0;

      return {
        before() {
          selectors = new WeakSet();
          depth = 0;
          return gate(context, ".peek()");
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          if (callee?.type === "Identifier" && TRACKING_CALLEES.has(callee.name as string)) {
            const argument = ((node.arguments as AstNode[] | undefined) ?? [])[0];
            if (isFunction(argument)) selectors.add(argument);
          }

          if (depth === 0) return;
          if (callee?.type !== "MemberExpression" || (callee.property as AstNode | undefined)?.name !== "peek") return;
          const object = callee.object as AstNode | undefined;
          if (!isObservableRef(object)) return;

          const target = textOf(context, object) ?? "the observable";
          context.report({
            node,
            message: `Use \`${target}.get()\` inside this selector and keep \`peek()\` for handlers and async work. \`peek()\` never subscribes, so the selector never re-runs and the component keeps rendering the first value.`,
          });
        },
        ArrowFunctionExpression(node) {
          if (selectors.has(node)) depth++;
        },
        "ArrowFunctionExpression:exit"(node) {
          if (selectors.has(node)) depth--;
        },
        FunctionExpression(node) {
          if (selectors.has(node)) depth++;
        },
        "FunctionExpression:exit"(node) {
          if (selectors.has(node)) depth--;
        },
      };
    },
  }
);
