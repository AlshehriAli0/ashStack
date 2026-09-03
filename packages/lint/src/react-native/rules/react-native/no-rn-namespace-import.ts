import { gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGES = {
  namespaceImport:
    'Import the react-native APIs by name instead: `import { View, Platform } from "react-native"` — a namespace import defeats Metro platform shaking.',
  platformReExport:
    "Drop this re-export and have each consumer import `Platform` straight from react-native; re-exporting it defeats Metro platform shaking.",
};

export const noRnNamespaceImport: Rule = problem(
  "Disallow a namespace import of react-native and a re-export of its `Platform`. Both defeat Metro's platform shaking, so dead `Platform.OS` branches ship in both bundles.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "react-native");
        },
        ImportDeclaration(node) {
          if (node.source.value !== "react-native") return;
          for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportNamespaceSpecifier") continue;
            context.report({ node: specifier, message: MESSAGES.namespaceImport });
          }
        },
        ExportAllDeclaration(node) {
          if (node.source.value !== "react-native") return;
          context.report({ node, message: MESSAGES.namespaceImport });
        },
        ExportNamedDeclaration(node) {
          if (node.source?.value !== "react-native") return;
          for (const specifier of node.specifiers) {
            const { local } = specifier;
            if (local.type !== "Identifier" || local.name !== "Platform") continue;
            context.report({ node: specifier, message: MESSAGES.platformReExport });
          }
        },
      };
    },
  }
);
