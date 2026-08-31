import { gate, importedSpecifiers, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { asNode, asNodes, type RnContext } from "./shared.js";

const MESSAGE =
  "Render this network image with `TurboImage` (react-native-turbo-image), passing `resize` and `cachePolicy`; keep react-native `<Image>` for local `require(...)` assets. RN `<Image>` has no disk cache and no decode sizing, so it re-downloads and decodes at full size on every cold start.";

const hasUriProperty = (node: AstNode): boolean => {
  const value = asNode(node.value);
  const expression = value?.type === "JSXExpressionContainer" ? asNode(value.expression) : undefined;
  if (expression?.type !== "ObjectExpression") return false;
  return asNodes(expression.properties).some(property => {
    const key = asNode(property.key);
    return (property.type === "Property" || property.type === "ObjectProperty") && (key?.name ?? key?.value) === "uri";
  });
};

export const noRnImageNetworkSource: Rule = problem(
  "Bans a react-native `<Image>` with a network `{ uri }` source. It has no disk cache and no decode sizing, so the image re-downloads at full size on every cold start.",
  {
    createOnce(context: RnContext) {
      const imageBindings = new Set<string>();
      const candidates: { node: AstNode; tag: string }[] = [];
      return {
        before() {
          imageBindings.clear();
          candidates.length = 0;
          return gate(context, "source");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "react-native")) {
            if (specifier.type === "ImportSpecifier" && asNode(specifier.imported)?.name === "Image") {
              imageBindings.add((asNode(specifier.local)?.name as string | undefined) ?? "Image");
            }
          }
        },
        JSXOpeningElement(node) {
          const tag = tagIdentifier(asNode(node.name));
          if (tag === "") return;
          const source = asNodes(node.attributes).find(
            attribute => attribute.type === "JSXAttribute" && asNode(attribute.name)?.name === "source"
          );
          if (!source || !hasUriProperty(source)) return;
          candidates.push({ node: asNode(node.name) as AstNode, tag });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!imageBindings.has(candidate.tag)) continue;
            context.report({ node: candidate.node, message: MESSAGE });
          }
        },
      };
    },
  }
);
