import { gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf, type GateContext } from "./shared.js";

const TRACKING_CONTEXT_CALLEES = new Set([
  "useValue",
  "observe",
  "useObserve",
  "useObserveEffect",
  "when",
  "whenReady",
]);

const trackingCallbackOf = (node: AstNode, callee: AstNode | undefined): AstNode | null => {
  if (callee?.type !== "Identifier") return null;
  if (!TRACKING_CONTEXT_CALLEES.has(callee.name as string)) return null;
  const argument = ((node.arguments as AstNode[] | undefined) ?? [])[0];
  return isFunction(argument) ? argument : null;
};

const peekedObservable = (callee: AstNode | undefined): AstNode | null => {
  if (callee?.type !== "MemberExpression") return null;
  if ((callee.property as AstNode | undefined)?.name !== "peek") return null;
  const object = callee.object as AstNode | undefined;
  return object !== undefined && isObservableRef(object) ? object : null;
};

export const noPeekInSelector: Rule = problem(
  "`peek()` never subscribes, so a selector or tracking callback that uses it never re-runs. Call `get()` there and keep `peek()` for handlers.",
  {
    createOnce(context: GateContext) {
      let trackingCallbacks = new WeakSet<AstNode>();
      let depth = 0;
      const enterIfTracking = (node: AstNode): void => {
        if (trackingCallbacks.has(node)) depth++;
      };
      const exitIfTracking = (node: AstNode): void => {
        if (trackingCallbacks.has(node)) depth--;
      };

      return {
        before() {
          trackingCallbacks = new WeakSet();
          depth = 0;
          return gate(context, ".peek()");
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          const callback = trackingCallbackOf(node, callee);
          if (callback) trackingCallbacks.add(callback);

          if (depth === 0) return;
          const observable = peekedObservable(callee);
          if (!observable) return;

          const target = textOf(context, observable) ?? "the observable";
          context.report({
            node,
            message: `Use \`${target}.get()\` inside this selector and keep \`peek()\` for handlers and async work. \`peek()\` never subscribes, so the selector never re-runs and the component keeps rendering the first value.`,
          });
        },
        ArrowFunctionExpression: enterIfTracking,
        "ArrowFunctionExpression:exit": exitIfTracking,
        FunctionExpression: enterIfTracking,
        "FunctionExpression:exit": exitIfTracking,
      };
    },
  }
);
