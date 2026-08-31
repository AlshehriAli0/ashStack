import { attributeName, gate, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { TurboImageContext } from "./shared.js";

const MESSAGE =
  'Add `cachePolicy` to this TurboImage (normally `cachePolicy="dataCache"`), or it re-fetches over the network on every cold start.';

export const requireCachePolicy: Rule = problem(
  "Requires `cachePolicy` on a TurboImage. Without one the image is re-fetched over the network on every cold start, so an already-scrolled feed costs its bandwidth again.",
  {
    createOnce(context: TurboImageContext) {
      return {
        before() {
          return gate(context, "TurboImage");
        },
        JSXOpeningElement(node) {
          if (!tagIdentifier(node.name as AstNode | undefined).endsWith("TurboImage")) return;
          const attributes = (node.attributes as AstNode[] | undefined) ?? [];
          if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
          if (attributes.some(attribute => attributeName(attribute) === "cachePolicy")) return;
          context.report({ node: node.name as AstNode, message: MESSAGE });
        },
      };
    },
  }
);
