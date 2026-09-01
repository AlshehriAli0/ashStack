import { calleeName, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";
import { ANIMATED_STYLE_HOOKS } from "./shared.js";

const UPDATER_SIDE_EFFECT =
  "Schedule this RN side effect from an animation completion callback or `useAnimatedReaction` instead; `useAnimatedStyle`/`useAnimatedProps` updaters must stay pure.";

export const animatedUpdaterPurity: Rule = problem(
  "An updater passed to `useAnimatedStyle` or `useAnimatedProps` must stay pure, so it may not write a shared value or call `scheduleOnRN`.",
  {
    createOnce(context: RuleContext) {
      let depth = 0;
      return {
        before() {
          depth = 0;
        },
        CallExpression(node) {
          const name = calleeName(node);
          if (ANIMATED_STYLE_HOOKS.has(name)) {
            depth += 1;
            return;
          }
          if (depth === 0) return;
          if (name === "set" || name === "modify") {
            if (node.callee.type !== "MemberExpression") return;
            context.report({
              node,
              message: `Move this \`.${name}()\` write out to an event handler, an effect, a derived value, or \`useAnimatedReaction\`; \`useAnimatedStyle\`/\`useAnimatedProps\` updaters must stay pure.`,
            });
            return;
          }
          if (name !== "scheduleOnRN") return;
          context.report({ node, message: UPDATER_SIDE_EFFECT });
        },
        "CallExpression:exit"(node) {
          if (ANIMATED_STYLE_HOOKS.has(calleeName(node))) depth -= 1;
        },
      };
    },
  }
);
