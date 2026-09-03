import { attributeName, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const SCROLL_HANDLERS = new Set(["onScroll", "onScrollBeginDrag", "onScrollEndDrag", "onMomentumScrollEnd"]);

const STATE_SETTER = /^set[A-Z]/;

const MESSAGE =
  "Use `useAnimatedScrollHandler` with a shared value when this drives an animation, or a ref when nothing renders from it — a state setter here re-renders every frame.";

export const noScrollPositionState: Rule = problem(
  "Disallow a React state setter inside a scroll handler prop. Scroll fires every frame, and so would the re-render.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, ...SCROLL_HANDLERS);
        },
        JSXAttribute(node) {
          if (!SCROLL_HANDLERS.has(attributeName(node))) return;
          const { value } = node;
          const expression = value?.type === "JSXExpressionContainer" ? value.expression : undefined;
          if (expression?.type !== "ArrowFunctionExpression" && expression?.type !== "FunctionExpression") return;
          const setsState = subtreeHas(
            expression.body,
            current =>
              current.type === "CallExpression" &&
              current.callee.type === "Identifier" &&
              STATE_SETTER.test(current.callee.name)
          );
          if (setsState) context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
