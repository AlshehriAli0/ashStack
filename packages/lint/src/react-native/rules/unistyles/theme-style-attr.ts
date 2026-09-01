import { closestAncestor, FUNCTION_TYPES, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { declaresUseUnistylesTheme, readsTheme } from "./shared.js";

const MESSAGE =
  "Resolve theme-dependent style values inside `StyleSheet.create` instead of reading `theme` in a JSX `style` prop or passing it into a dynamic style function.";

export const themeStyleAttr: Rule = problem(
  "Theme-dependent values belong in `StyleSheet.create`, not in a JSX `style` prop that reads a `useUnistyles()` theme.",
  {
    createOnce(context) {
      return {
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;
          if (!readsTheme(node)) return;
          const component = closestAncestor(node, FUNCTION_TYPES);
          if (!component || !declaresUseUnistylesTheme(component)) return;
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
