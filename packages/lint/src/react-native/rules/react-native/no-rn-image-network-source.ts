import { componentName, gate, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Render this network image with `TurboImage` (react-native-turbo-image), passing `resize` and `cachePolicy`; keep react-native `<Image>` for local `require(...)` assets. RN `<Image>` has no disk cache and no decode sizing, so it re-downloads and decodes at full size on every cold start.";

/** A property key reads by name (`{ uri }`) or, for a string key, by value (`{ "uri" }`). */
const keyName = (key: AstNode): string | undefined => {
  if (key.type === "Identifier") return key.name;
  return key.type === "Literal" && typeof key.value === "string" ? key.value : undefined;
};

const hasUriProperty = (attribute: AstNode): boolean => {
  if (attribute.type !== "JSXAttribute") return false;
  const { value } = attribute;
  const expression = value?.type === "JSXExpressionContainer" ? value.expression : undefined;
  if (expression?.type !== "ObjectExpression") return false;
  return expression.properties.some(property => property.type === "Property" && keyName(property.key) === "uri");
};

export const noRnImageNetworkSource: Rule = problem(
  "Disallow a react-native `<Image>` with a network `{ uri }` source. It has no disk cache and no decode sizing, so the image re-downloads at full size on every cold start.",
  {
    createOnce(context: RuleContext) {
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
            if (specifier.type !== "ImportSpecifier") continue;
            const { imported } = specifier;
            if (imported.type === "Identifier" && imported.name === "Image") {
              imageBindings.add(specifier.local.name);
            }
          }
        },
        JSXOpeningElement(node) {
          const tag = componentName(node.name);
          if (tag === "") return;
          const source = node.attributes.find(
            attribute =>
              attribute.type === "JSXAttribute" &&
              attribute.name.type === "JSXIdentifier" &&
              attribute.name.name === "source"
          );
          if (!source || !hasUriProperty(source)) return;
          candidates.push({ node: node.name, tag });
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
