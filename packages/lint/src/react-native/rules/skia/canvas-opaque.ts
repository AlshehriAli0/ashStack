import { attributeName, gate, importedSpecifiers, problem, tagPath } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Add an explicit `opaque` prop to this `<Canvas>`: `opaque={Platform.OS === 'android'}` for a fullscreen animated canvas, or `opaque={false}` when it needs transparency, view transforms, or ordinary stacking.";

export const canvasOpaque: Rule = problem(
  "Require an explicit `opaque` prop on a Skia `<Canvas>`. A fullscreen animated canvas wants it on; anything that needs transparency or a view transform wants it off.",
  {
    createOnce(context: RuleContext) {
      const canvasLocals = new Set<string>();
      const namespaces = new Set<string>();
      const elements: AstNode[] = [];
      /** `<Canvas>` under its imported name, or `<Skia.Canvas>` under a namespace or default import. */
      const namesACanvas = (name: AstNode): boolean => {
        const path = tagPath(name);
        const dot = path.lastIndexOf(".");
        if (dot === -1) return canvasLocals.has(path);
        return namespaces.has(path.slice(0, dot)) && path.slice(dot + 1) === "Canvas";
      };

      return {
        before() {
          canvasLocals.clear();
          namespaces.clear();
          elements.length = 0;
          return gate(context, "react-native-skia");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "@shopify/react-native-skia")) {
            if (specifier.type === "ImportSpecifier") {
              const { imported, local } = specifier;
              if (imported.type === "Identifier" && imported.name === "Canvas") canvasLocals.add(local.name);
              continue;
            }
            if (specifier.type === "ImportNamespaceSpecifier" || specifier.type === "ImportDefaultSpecifier") {
              namespaces.add(specifier.local.name);
            }
          }
        },
        JSXOpeningElement(node) {
          if (!namesACanvas(node.name)) return;
          const hasOpaque = node.attributes.some(
            attribute => attribute.type === "JSXAttribute" && attributeName(attribute) === "opaque"
          );
          if (!hasOpaque) elements.push(node);
        },
        "Program:exit"() {
          for (const element of elements) context.report({ node: element, message: MESSAGE });
        },
      };
    },
  }
);
