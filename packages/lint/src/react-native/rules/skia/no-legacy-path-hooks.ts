import { gate, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { SkiaContext } from "./shared.js";

const PATH_HOOKS = new Set(["usePathValue", "usePathInterpolation"]);

const MESSAGE =
  "Keep one stable `SkPath` buffer and mutate it inside `useDerivedValue`, with consumers reading the driving shared value. These legacy path-value hooks self-dirty Reanimated mappers and re-record idle canvases.";

export const noLegacyPathHooks: Rule = problem(
  "Bans the `usePathValue` and `usePathInterpolation` imports. Both self-dirty Reanimated mappers and re-record idle canvases.",
  {
    createOnce(context: SkiaContext) {
      return {
        before() {
          return gate(context, "react-native-skia");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "@shopify/react-native-skia")) {
            if (specifier.type !== "ImportSpecifier") continue;
            const imported = (specifier.imported as AstNode | undefined)?.name as string | undefined;
            if (imported !== undefined && PATH_HOOKS.has(imported)) {
              context.report({ node: specifier, message: MESSAGE });
            }
          }
        },
      };
    },
  }
);
