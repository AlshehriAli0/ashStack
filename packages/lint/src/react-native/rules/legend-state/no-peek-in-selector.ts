import { gate, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isObservableRef, textOf } from "./shared.js";

const TRACKING_CONTEXT_CALLEES = new Set([
  "useValue",
  "observe",
  "useObserve",
  "useObserveEffect",
  "when",
  "whenReady",
]);

const trackingCallbackOf = (node: Extract<AstNode, { type: "CallExpression" }>): AstNode | null => {
  const { callee } = node;
  if (callee.type !== "Identifier") return null;
  if (!TRACKING_CONTEXT_CALLEES.has(callee.name)) return null;
  const argument = node.arguments[0];
  return argument && isFunction(argument) ? argument : null;
};

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
          const callback = trackingCallbackOf(node);
          if (callback) trackingCallbacks.add(callback);

          if (depth === 0) return;
          const observable = peekedObservable(node.callee);
          if (!observable) return;

          const target = textOf(context, observable);
          context.report({
            node,
            message: `Use \`${target}.get()\` inside this selector and keep \`peek()\` for handlers and async work — \`peek()\` never subscribes, so nothing re-runs.`,
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
