import { calleeName, closestAncestor, FUNCTION_TYPES, gate, hasAncestor, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";
import { isWorklet } from "./shared.js";

const SCHEDULES = new Set(["scheduleOnUI", "scheduleOnRuntime", "scheduleOnRuntimeWithId"]);
const TIMERS = new Set(["setInterval", "setTimeout"]);

export const noJsTimerSchedule: Rule = problem(
  "Disallow a React Native Runtime `setInterval` or `setTimeout` callback that calls `scheduleOnUI` or `scheduleOnRuntime`. Each time the timer fires it waits for the JavaScript thread and sends a new job; start the timer on the target runtime instead.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "setInterval", "setTimeout");
        },
        CallExpression(node) {
          const name = calleeName(node);
          if (!SCHEDULES.has(name)) return;
          const callback = closestAncestor(node, FUNCTION_TYPES);
          const timer = callback?.parent;
          if (timer?.type !== "CallExpression" || timer.arguments[0] !== callback) return;
          const timerName = calleeName(timer);
          if (!TIMERS.has(timerName) || hasAncestor(timer, isWorklet)) return;
          context.report({
            node,
            message: `Start the timer on the target runtime: \`${name}\` a worklet that calls \`${timerName}\` there. A \`${timerName}\` on the React Native Runtime waits for the JavaScript thread and sends a new job each time it fires.`,
          });
        },
      };
    },
  }
);
