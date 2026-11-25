import {
  calleeName,
  crossesFunctionBefore,
  findInSubtree,
  FUNCTION_TYPES,
  gate,
  problem,
  subtreeHas,
} from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const EFFECTS = new Set(["useEffect", "useLayoutEffect"]);

/** Calls that register something an effect has to undo. A one-shot `setTimeout` is left alone. */
const REGISTERING_CALLS = new Set(["addEventListener", "addListener", "subscribe", "setInterval"]);

/** Constructors whose instance an effect has to close or abort. */
const REGISTERING_CONSTRUCTORS = new Set(["WebSocket", "AbortController"]);

const registers = (node: AstNode): boolean =>
  REGISTERING_CALLS.has(calleeName(node)) ||
  (node.type === "NewExpression" &&
    node.callee.type === "Identifier" &&
    REGISTERING_CONSTRUCTORS.has(node.callee.name));

const registeredName = (node: AstNode): string =>
  node.type === "NewExpression" && node.callee.type === "Identifier" ? `new ${node.callee.name}` : calleeName(node);

const returnsCleanup = (effect: AstNode): boolean =>
  (effect.type === "ArrowFunctionExpression" && effect.expression) ||
  subtreeHas(
    effect,
    node =>
      node.type === "ReturnStatement" && node.argument !== null && !crossesFunctionBefore(node, effect, FUNCTION_TYPES)
  );

export const requireEffectCleanup: Rule = problem(
  "Require a `useEffect` or `useLayoutEffect` that adds a listener, subscribes, starts an interval, or opens a `WebSocket` or `AbortController` to return a cleanup. Without one, every re-run and unmount leaves the previous one running.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "Effect");
        },
        CallExpression(node) {
          if (!EFFECTS.has(calleeName(node))) return;
          const [effect] = node.arguments;
          if (effect?.type !== "ArrowFunctionExpression" && effect?.type !== "FunctionExpression") return;
          const registered = findInSubtree(effect.body, registers);
          if (registered === null || returnsCleanup(effect)) return;
          context.report({
            node: registered,
            message: `Return a cleanup from this effect that undoes \`${registeredName(registered)}\`: remove the listener, unsubscribe, \`clearInterval\`, \`close()\` or \`abort()\`. Without one, every re-run and unmount leaves the previous one running.`,
          });
        },
      };
    },
  }
);
