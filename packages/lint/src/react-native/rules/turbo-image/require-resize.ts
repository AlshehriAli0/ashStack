import { attributeName, componentName, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Add `resize` to this TurboImage, set slightly BELOW the rendered width in points, so the native decoder downsamples before the bitmap reaches memory.";

export const requireResize: Rule = problem(
  "Require `resize` on a TurboImage so the native decoder downsamples before the bitmap reaches memory. A full-resolution decode wastes tens of megabytes and stalls the first frame.",
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
          const hasResize = attributes.some(
            attribute => attribute.type === "JSXAttribute" && attributeName(attribute) === "resize"
          );
          if (hasResize) return;
          context.report({ node: node.name, message: MESSAGE });
        },
      };
    },
  }
);
