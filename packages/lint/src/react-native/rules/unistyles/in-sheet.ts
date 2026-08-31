import { calleeName, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { inCreate, isStyleSheetCreate, memberPath, propertyName } from "./shared.js";

const LOGICAL_SPACING = new Set(["paddingLeft", "paddingRight", "marginLeft", "marginRight"]);

const LEGACY_SHADOW = new Set(["shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation"]);

const MESSAGES = {
  logicalSpacing:
    "Use `paddingStart`/`paddingEnd` or `marginStart`/`marginEnd` here so the directional spacing mirrors in RTL.",
  rtlInSheet: "Use `rt.rtl` for RTL-dependent styles so Unistyles tracks the dependency natively.",
  screenDimensions: "Use reactive `rt.screen` inside `StyleSheet.create` instead of a `Dimensions.get` snapshot.",
  pixelRatio: "Use reactive `rt.pixelRatio` inside `StyleSheet.create`.",
  fontScale: "Use reactive `rt.fontScale` inside `StyleSheet.create`.",
  statusBar: "Use reactive `rt.statusBar.height` inside `StyleSheet.create`.",
  colorScheme: "Use the Unistyles theme or reactive `rt.colorScheme` inside `StyleSheet.create`.",
  fullRuntime:
    "Use the injected mini runtime (`rt`) inside `StyleSheet.create` instead of `UnistylesRuntime`, so the style recalculates on its own.",
  fullRuntimeDestructure:
    "Destructure from the injected mini runtime (`rt`) inside `StyleSheet.create`, not from `UnistylesRuntime`.",
  themeScreen:
    "Use reactive `rt.screen`, or Unistyles breakpoints, instead of the theme's module-initialization screen snapshot.",
  borderCurve:
    'Add `borderCurve` (normally `"continuous"`) alongside `borderRadius`, or the corner renders as a circular arc rather than the squircle native iOS controls use.',
  legacyShadow:
    'Use `boxShadow` with CSS syntax, e.g. `boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"`, which renders on both platforms on the New Architecture, instead of the legacy `shadow*`/`elevation` props.',
  asConst:
    "Drop `as const` here — the typed `StyleSheet.create` already narrows the literal. If TS still widens the value to `string`, fix the `StyleSheet` import instead.",
};

export const inSheet: Rule = inCreate(
  "Inside `StyleSheet.create`, require `rt` and theme values rather than Dimensions, PixelRatio, Appearance, I18nManager, StatusBar or `UnistylesRuntime`. It also covers logical spacing, `boxShadow`, `borderCurve` and a redundant `as const`.",
  (context, inside) => ({
    CallExpression(node) {
      if (!inside() || isStyleSheetCreate(node)) return;
      const callee = node.callee as AstNode | undefined;
      const path = callee?.type === "MemberExpression" ? memberPath(callee) : calleeName(node);
      if (path === "Dimensions.get") context.report({ node, message: MESSAGES.screenDimensions });
      else if (path === "PixelRatio.get") context.report({ node, message: MESSAGES.pixelRatio });
      else if (path === "PixelRatio.getFontScale") context.report({ node, message: MESSAGES.fontScale });
      else if (path === "Appearance.getColorScheme") context.report({ node, message: MESSAGES.colorScheme });
      else if (path === "useColorScheme") context.report({ node, message: MESSAGES.colorScheme });
    },
    MemberExpression(node) {
      if (!inside()) return;
      const parent = node.parent;
      if (parent?.type === "MemberExpression" && parent.object === node) return;
      const path = memberPath(node);
      if (path === "I18nManager.isRTL") {
        context.report({ node, message: MESSAGES.rtlInSheet });
        return;
      }
      if (path === "StatusBar.currentHeight") {
        context.report({ node, message: MESSAGES.statusBar });
        return;
      }
      if (path.startsWith("UnistylesRuntime.")) {
        context.report({ node, message: MESSAGES.fullRuntime });
        return;
      }
      if (/^theme\.screen\./.test(path)) context.report({ node, message: MESSAGES.themeScreen });
    },
    VariableDeclarator(node) {
      if (!inside()) return;
      const id = node.id as AstNode | undefined;
      const init = node.init as AstNode | undefined;
      if (id?.type !== "ObjectPattern") return;
      if (init?.type === "Identifier" && init.name === "UnistylesRuntime") {
        context.report({ node, message: MESSAGES.fullRuntimeDestructure });
      }
    },
    TSAsExpression(node) {
      if (!inside()) return;
      const annotation = node.typeAnnotation as AstNode | undefined;
      if (annotation?.type !== "TSTypeReference") return;
      if ((annotation.typeName as AstNode | undefined)?.name !== "const") return;
      context.report({ node, message: MESSAGES.asConst });
    },
    ObjectExpression(node) {
      if (!inside()) return;
      let borderRadius: AstNode | null = null;
      let hasBorderCurve = false;
      for (const property of (node.properties as AstNode[] | undefined) ?? []) {
        if (property.type !== "Property") continue;
        const name = propertyName(property);
        if (name === "borderRadius") borderRadius = property;
        else if (name === "borderCurve") hasBorderCurve = true;
      }
      if (borderRadius && !hasBorderCurve) context.report({ node: borderRadius, message: MESSAGES.borderCurve });
    },
    Property(node) {
      if (!inside()) return;
      const name = propertyName(node);
      if (LEGACY_SHADOW.has(name)) {
        context.report({ node, message: MESSAGES.legacyShadow });
        return;
      }
      if (!LOGICAL_SPACING.has(name)) return;
      const usesInsets = subtreeHas(node, current => {
        if (current.type !== "MemberExpression") return false;
        const path = memberPath(current);
        return path === "rt.insets.left" || path === "rt.insets.right";
      });
      if (!usesInsets) context.report({ node, message: MESSAGES.logicalSpacing });
    },
  })
);
