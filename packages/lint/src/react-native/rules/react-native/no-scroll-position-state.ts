import { attributeName, gate, isFunction, problem, subtreeHas } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { asNode, type RnContext } from "./shared.js";

const SCROLL_HANDLERS = new Set(["onScroll", "onScrollBeginDrag", "onScrollEndDrag", "onMomentumScrollEnd"]);

const STATE_SETTER = /^set[A-Z]/;

const MESSAGE =
  "Use `useAnimatedScrollHandler` with a shared value when this drives an animation, or a ref when nothing renders from it. Scroll fires every frame, so a state setter here re-renders the screen every frame.";

export const noScrollPositionState: Rule = problem(
  "Bans a React state setter inside a scroll handler prop. Scroll fires every frame, and so would the re-render.",
  {
    createOnce(context: RnContext) {
      return {
        before() {
          return gate(context, "onScroll");
        },
        JSXAttribute(node) {
          if (!SCROLL_HANDLERS.has(attributeName(node))) return;
          const value = asNode(node.value);
          const expression = value?.type === "JSXExpressionContainer" ? asNode(value.expression) : undefined;
          if (!isFunction(expression)) return;
          const setsState = subtreeHas(expression?.body, current => {
            const callee = asNode(current.callee);
            return (
              current.type === "CallExpression" &&
              callee?.type === "Identifier" &&
              STATE_SETTER.test(callee.name as string)
            );
          });
          if (setsState) context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
