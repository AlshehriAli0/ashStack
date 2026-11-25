import { calleeName, gate, isFunction, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

/** Animation factory to the index of the completion callback it takes. */
const CALLBACK_ARGUMENT = new Map([
  ["withTiming", 2],
  ["withSpring", 2],
  ["withDecay", 1],
]);

const CHECK_FINISHED =
  "Take `finished` and call `scheduleOnRN` only `if (finished)`. The callback also runs when the animation is cancelled or interrupted, with `finished` false, so this fires for an animation that never landed.";

const isScheduleOnRn = (node: AstNode): boolean => calleeName(node) === "scheduleOnRN";

/** Whether the callback reads its first parameter anywhere: a guard, an early return, or handing it on. */
const readsFinished = (callback: AstNode): boolean => {
  if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") return false;
  const [finished] = callback.params;
  if (finished?.type !== "Identifier") return false;
  const { name } = finished;
  return subtreeHas(callback.body, node => node.type === "Identifier" && node.name === name);
};

export const checkFinished: Rule = problem(
  "Require an animation completion callback that calls `scheduleOnRN` to read its `finished` argument. The callback also runs when the animation is cancelled, and then `finished` is false.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "scheduleOnRN");
        },
        CallExpression(node) {
          const index = CALLBACK_ARGUMENT.get(calleeName(node));
          const callback = index === undefined ? undefined : node.arguments[index];
          if (callback === undefined || !isFunction(callback)) return;
          if (!subtreeHas(callback, isScheduleOnRn) || readsFinished(callback)) return;
          context.report({ node: callback, message: CHECK_FINISHED });
        },
      };
    },
  }
);
