import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { asNode, asNodes, type RnContext } from "./shared.js";

const MESSAGES = {
  namespaceImport:
    'Import the react-native APIs by name instead: `import { View, Platform } from "react-native"`. A namespace import defeats Metro platform shaking, so dead `Platform.OS` branches ship in both bundles.',
  platformReExport:
    "Drop this re-export and have each consumer import `Platform` straight from react-native; re-exporting it defeats Metro platform shaking.",
};

export const noRnNamespaceImport: Rule = problem(
  "Bans a namespace import of react-native and a re-export of its `Platform`. Both defeat Metro's platform shaking, so dead `Platform.OS` branches ship in both bundles.",
  {
    createOnce(context: RnContext) {
      return {
        before() {
          return gate(context, "react-native");
        },
        ImportDeclaration(node) {
          if (asNode(node.source)?.value !== "react-native") return;
          for (const specifier of asNodes(node.specifiers)) {
            if (specifier.type !== "ImportNamespaceSpecifier") continue;
            context.report({ node: specifier, message: MESSAGES.namespaceImport });
          }
        },
        ExportNamedDeclaration(node) {
          if (asNode(node.source)?.value !== "react-native") return;
          for (const specifier of asNodes(node.specifiers)) {
            if (asNode(specifier.local)?.name !== "Platform") continue;
            context.report({ node: specifier, message: MESSAGES.platformReExport });
          }
        },
      };
    },
  }
);
