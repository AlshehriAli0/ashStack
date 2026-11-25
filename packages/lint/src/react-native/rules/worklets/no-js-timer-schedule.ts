import { calleeName, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";
import { enclosingFunction } from "./shared.js";

const SCHEDULES = new Set(["scheduleOnUI", "scheduleOnRuntime", "scheduleOnRuntimeWithId"]);
const TIMERS = new Set(["setInterval", "setTimeout"]);

export const noJsTimerSchedule: Rule = problem(
  "Disallow a `setInterval` or `setTimeout` callback that calls `scheduleOnUI` or `scheduleOnRuntime`. Each tick sends a new job to the other runtime; start the timer on the target runtime instead.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "setInterval", "setTimeout");
        },
        CallExpression(node) {
          const name = calleeName(node);
          if (!SCHEDULES.has(name)) return;
          const callback = enclosingFunction(node);
          const timer = callback?.parent;
          if (timer?.type !== "CallExpression" || timer.arguments[0] !== callback) return;
          const timerName = calleeName(timer);
          if (!TIMERS.has(timerName)) return;
          context.report({
            node,
            message: `Start the timer on the target runtime: \`${name}\` a worklet that calls \`${timerName}\` there once. From a JS-thread \`${timerName}\`, every tick sends a new job to that runtime.`,
          });
        },
      };
    },
  }
);
