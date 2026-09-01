import { findInSubtree, hasAncestor, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { inCreate, memberPath, propertyName } from "./shared.js";

const SPACING_AND_TYPE_SCALE = new Set([
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "paddingVertical",
  "paddingStart",
  "paddingEnd",
  "margin",
  "marginTop",
  "marginBottom",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "gap",
  "rowGap",
  "columnGap",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "fontSize",
  "lineHeight",
]);

const SIGNIFICANT_NUMBER = /^-?[1-9][0-9]*(?:\.[0-9]+)?$/;

const MESSAGE =
  "Use `theme.spacing[...]` or `theme.sizing.scale(...)` for this value, so a rhythm change stays one edit. If no token fits, add one to the theme.";

const isThemeScaleHost = (node: AstNode): boolean =>
  hasAncestor(node, current => {
    if (current.type === "MemberExpression") {
      const path = memberPath(current);
      if (path.startsWith("theme.spacing") || path.startsWith("theme.sizing")) return true;
    }
    if (current.type === "CallExpression") {
      const callee = current.callee as AstNode | undefined;
      const path = callee?.type === "MemberExpression" ? memberPath(callee) : "";
      if (path === "theme.spacing.scale" || path === "theme.sizing.scale" || path === "theme.scale") return true;
    }
    return false;
  });

const isTokenDerived = (node: unknown): boolean =>
  subtreeHas(node, current => {
    if (current.type === "MemberExpression") {
      const path = memberPath(current);
      return path.startsWith("theme.spacing") || path.startsWith("theme.sizing");
    }
    const callee = current.callee as AstNode | undefined;
    if (current.type === "CallExpression" && callee?.type === "MemberExpression") {
      const path = memberPath(callee);
      return path === "theme.spacing.scale" || path === "theme.sizing.scale" || path === "theme.scale";
    }
    return false;
  });

export const noHardcodedSpacing: Rule = inCreate(
  "Require `theme.spacing` or `theme.sizing.scale` for spacing, radius and type values inside `StyleSheet.create`, instead of raw numbers.",
  (context, inside) => ({
    Property(node) {
      if (!inside()) return;
      const name = propertyName(node);
      if (!SPACING_AND_TYPE_SCALE.has(name)) return;
      if (isTokenDerived(node.value)) return;
      const rawNumber = findInSubtree(node.value, current => {
        const argument = current.argument as AstNode | undefined;
        return (
          (current.type === "Literal" &&
            typeof current.value === "number" &&
            SIGNIFICANT_NUMBER.test(String(current.value)) &&
            !isThemeScaleHost(current)) ||
          (current.type === "UnaryExpression" &&
            current.operator === "-" &&
            argument?.type === "Literal" &&
            typeof argument.value === "number" &&
            SIGNIFICANT_NUMBER.test(`-${argument.value}`) &&
            !isThemeScaleHost(current))
        );
      });
      if (rawNumber) context.report({ node: rawNumber, message: MESSAGE });
    },
  })
);
