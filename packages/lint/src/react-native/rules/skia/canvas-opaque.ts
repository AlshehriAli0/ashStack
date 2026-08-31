import { gate, importedSpecifiers, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { SkiaContext } from "./shared.js";

const MESSAGE =
  "Add an explicit `opaque` prop to this `<Canvas>`: `opaque={Platform.OS === 'android'}` for a fullscreen animated canvas, or `opaque={false}` when it needs transparency, view transforms, or ordinary stacking.";

export const canvasOpaque: Rule = problem(
  "Requires an explicit `opaque` prop on a Skia `<Canvas>`. A fullscreen animated canvas wants it on; anything that needs transparency or a view transform wants it off.",
  {
    createOnce(context: SkiaContext) {
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
            const imported = (specifier.imported as AstNode | undefined)?.name;
            const local = (specifier.local as AstNode | undefined)?.name as string | undefined;
            if (imported === "Canvas" && /Canvas$/.test(local ?? "")) canvasLocals.add(local as string);
          }
        },
        JSXOpeningElement(node) {
          const name = tagIdentifier(node.name as AstNode | undefined);
          if (!name.endsWith("Canvas")) return;
          const hasOpaque = ((node.attributes as AstNode[] | undefined) ?? []).some(
            attribute => attribute.type === "JSXAttribute" && (attribute.name as AstNode | undefined)?.name === "opaque"
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
