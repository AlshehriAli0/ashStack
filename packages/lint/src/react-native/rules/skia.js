// @ashstack/lint — React Native Skia rules.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.

import { importedSpecifiers, tagIdentifier } from "../../lib/ast.js";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return typeof text !== "string" || markers.some(marker => text.includes(marker));
};

const PATH_HOOKS = new Set(["usePathValue", "usePathInterpolation"]);

const MESSAGES = {
  canvasMode:
    "Add an explicit `opaque` prop to this `<Canvas>`: `opaque={Platform.OS === 'android'}` for a fullscreen animated canvas, or `opaque={false}` when it needs transparency, view transforms, or ordinary stacking.",
  pathHooks:
    "Keep one stable `SkPath` buffer and mutate it inside `useDerivedValue`, with consumers reading the driving shared value. These legacy path-value hooks self-dirty Reanimated mappers and re-record idle canvases.",
};

const skiaPerformance = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require an explicit `opaque` prop on a Skia `<Canvas>` and disallow the legacy path-value hooks, which self-dirty Reanimated mappers and re-record idle canvases.",
    },
  },
  createOnce(context) {
    const canvasLocals = new Set();
    const elements = [];
    return {
      before() {
        canvasLocals.clear();
        elements.length = 0;
        return gate(context, "react-native-skia");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "@shopify/react-native-skia")) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported?.name;
          const local = specifier.local?.name;
          if (imported === "Canvas" && /Canvas$/.test(local ?? "")) canvasLocals.add(local);
          if (PATH_HOOKS.has(imported)) context.report({ node: specifier, message: MESSAGES.pathHooks });
        }
      },
      JSXOpeningElement(node) {
        const name = tagIdentifier(node.name);
        if (!name.endsWith("Canvas")) return;
        const hasOpaque = (node.attributes ?? []).some(
          attribute => attribute.type === "JSXAttribute" && attribute.name?.name === "opaque"
        );
        if (hasOpaque) return;
        elements.push({ node, name });
      },
      "Program:exit"() {
        for (const element of elements) {
          if (!canvasLocals.has(element.name)) continue;
          context.report({ node: element.node, message: MESSAGES.canvasMode });
        }
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/skia" },
  rules: {
    performance: skiaPerformance,
  },
};
