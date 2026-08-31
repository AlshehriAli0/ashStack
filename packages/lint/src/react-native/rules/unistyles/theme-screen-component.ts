import { closestAncestor, hasAncestor, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { declaresUseUnistylesTheme, isStyleSheetCreate, memberPath } from "./shared.js";

const MESSAGE =
  "Read current screen values from `useUnistyles().rt.screen` or `useWindowDimensions()` instead of the theme's module-initialization snapshot.";

export const themeScreenComponent: Rule = problem(
  "`theme.screen.*` is a snapshot taken at module initialization, so a component that reads it never sees the current size. `useUnistyles().rt.screen` and `useWindowDimensions` do.",
  {
    createOnce(context) {
      return {
        MemberExpression(node) {
          if (!/^theme\.screen\./.test(memberPath(node))) return;
          const parent = node.parent;
          if (parent?.type === "MemberExpression" && parent.object === node) return;
          if (hasAncestor(node, isStyleSheetCreate)) return;
          const component = closestAncestor(node, new Set(["FunctionDeclaration"]));
          if (!component || !declaresUseUnistylesTheme(component)) return;
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
