// @ashstack/lint — react-native-turbo-image rules.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.

import { attributeName, tagIdentifier } from "../../lib/ast.js";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return typeof text !== "string" || markers.some(marker => text.includes(marker));
};

const NEW_MESSAGES = {
  turboImageCachePolicy:
    'Add `cachePolicy` to this TurboImage (normally `cachePolicy="dataCache"`), or it re-fetches over the network on every cold start.',
};

const requireTurboImageResize = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `resize` on a TurboImage so the native decoder downsamples before the bitmap reaches memory; a full-resolution decode wastes tens of megabytes and stalls the first frame.",
    },
  },
  createOnce(context) {
    return {
      before() {
        return gate(context, "TurboImage");
      },
      JSXOpeningElement(node) {
        if (!tagIdentifier(node.name).endsWith("TurboImage")) return;
        const attributes = node.attributes ?? [];
        if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
        const hasResize = attributes.some(
          attribute => attribute.type === "JSXAttribute" && attribute.name?.name === "resize"
        );
        if (hasResize) return;
        context.report({
          node: node.name,
          message:
            "Add `resize` to this TurboImage, set slightly BELOW the rendered width in points, so the native decoder downsamples before the bitmap reaches memory. Rounding down costs nothing visible; a value above the rendered width keeps the full-resolution decode (a 4000px photo in a 100pt avatar holds roughly 48MB of pixels).",
        });
      },
    };
  },
};

const requireTurboImageCachePolicy = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `cachePolicy` on a TurboImage; without one the image is re-fetched over the network on every cold start, so an already-scrolled feed costs its bandwidth again.",
    },
  },
  createOnce(context) {
    return {
      before() {
        return gate(context, "TurboImage");
      },
      JSXOpeningElement(node) {
        if (!tagIdentifier(node.name).endsWith("TurboImage")) return;
        const attributes = node.attributes ?? [];
        if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
        if (attributes.some(attribute => attributeName(attribute) === "cachePolicy")) return;
        context.report({ node: node.name, message: NEW_MESSAGES.turboImageCachePolicy });
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/turbo-image" },
  rules: {
    "require-resize": requireTurboImageResize,
    "require-cache-policy": requireTurboImageCachePolicy,
  },
};
