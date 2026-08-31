import { gate, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { TurboImageContext } from "./shared.js";

const MESSAGE =
  "Add `resize` to this TurboImage, set slightly BELOW the rendered width in points, so the native decoder downsamples before the bitmap reaches memory. Rounding down costs nothing visible; a value above the rendered width keeps the full-resolution decode (a 4000px photo in a 100pt avatar holds roughly 48MB of pixels).";

export const requireResize: Rule = problem(
  "Requires `resize` on a TurboImage so the native decoder downsamples before the bitmap reaches memory. A full-resolution decode wastes tens of megabytes and stalls the first frame.",
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
          const hasResize = attributes.some(
            attribute => attribute.type === "JSXAttribute" && (attribute.name as AstNode | undefined)?.name === "resize"
          );
          if (hasResize) return;
          context.report({ node: node.name as AstNode, message: MESSAGE });
        },
      };
    },
  }
);
