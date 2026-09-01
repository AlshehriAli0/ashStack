import { attributeName, componentName, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  'Add `cachePolicy` to this TurboImage (normally `cachePolicy="dataCache"`), or it re-fetches over the network on every cold start.';

export const requireCachePolicy: Rule = problem(
  "Require `cachePolicy` on a TurboImage. Without one the image is re-fetched over the network on every cold start, so an already-scrolled feed costs its bandwidth again.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "TurboImage");
        },
        JSXOpeningElement(node) {
          if (componentName(node.name) !== "TurboImage") return;
          const { attributes } = node;
          if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
          if (attributes.some(attribute => attributeName(attribute) === "cachePolicy")) return;
          context.report({ node: node.name, message: MESSAGE });
        },
      };
    },
  }
);
