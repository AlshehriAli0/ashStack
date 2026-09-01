import { gate, importedSpecifiers, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Add an explicit `opaque` prop to this `<Canvas>`: `opaque={Platform.OS === 'android'}` for a fullscreen animated canvas, or `opaque={false}` when it needs transparency, view transforms, or ordinary stacking.";

export const canvasOpaque: Rule = problem(
  "Requires an explicit `opaque` prop on a Skia `<Canvas>`. A fullscreen animated canvas wants it on; anything that needs transparency or a view transform wants it off.",
  {
    createOnce(context: RuleContext) {
      const canvasLocals = new Set<string>();
      const elements: { node: AstNode; name: string }[] = [];
      return {
        before() {
          canvasLocals.clear();
          elements.length = 0;
          return gate(context, "react-native-skia");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "@shopify/react-native-skia")) {
            if (specifier.type !== "ImportSpecifier") continue;
            const { imported, local } = specifier;
            if (imported.type !== "Identifier" || imported.name !== "Canvas") continue;
            if (local.name.endsWith("Canvas")) canvasLocals.add(local.name);
          }
        },
        JSXOpeningElement(node) {
          if (node.type !== "JSXOpeningElement") return;
          const name = tagIdentifier(node.name);
          if (!name.endsWith("Canvas")) return;
          const hasOpaque = node.attributes.some(
            attribute =>
              attribute.type === "JSXAttribute" &&
              attribute.name.type === "JSXIdentifier" &&
              attribute.name.name === "opaque"
          );
          if (hasOpaque) return;
          elements.push({ node, name });
        },
        "Program:exit"() {
          for (const element of elements) {
            if (!canvasLocals.has(element.name)) continue;
            context.report({ node: element.node, message: MESSAGE });
          }
        },
      };
    },
  }
);
