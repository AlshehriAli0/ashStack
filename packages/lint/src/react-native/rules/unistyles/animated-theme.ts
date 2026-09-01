import { calleeName, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { readsTheme } from "./shared.js";

const WORKLET_HOOKS = new Set(["useAnimatedStyle", "useDerivedValue", "useAnimatedProps"]);

const MESSAGE =
  "Use `useAnimatedTheme()` and read its shared value inside the Reanimated worklet so theme changes reach the UI thread.";

export const animatedTheme: Rule = problem(
  "A Reanimated worklet hook cannot see `useUnistyles()` theme changes on the UI thread. Read the shared value from `useAnimatedTheme()` there instead.",
  {
    createOnce(context) {
      let declaresTheme = false;
      const candidates: AstNode[] = [];
      return {
        before() {
          declaresTheme = false;
          candidates.length = 0;
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (
            id.type === "ObjectPattern" &&
            calleeName(init) === "useUnistyles" &&
            id.properties.some(
              property =>
                property.type === "Property" && property.key.type === "Identifier" && property.key.name === "theme"
            )
          ) {
            declaresTheme = true;
          }
        },
        CallExpression(node) {
          if (!WORKLET_HOOKS.has(calleeName(node))) return;
          if (!readsTheme(node)) return;
          candidates.push(node);
        },
        "Program:exit"() {
          if (!declaresTheme) return;
          for (const node of candidates) context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
