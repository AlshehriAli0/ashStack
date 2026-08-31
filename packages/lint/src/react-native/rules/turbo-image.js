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
    'Add a cachePolicy (normally "dataCache"). Without it the image is re-fetched over the network on every cold start, so a feed the user already scrolled costs its bandwidth again and shows placeholders on a slow connection.',
};

const requireTurboImageResize = {
  meta: { type: "problem" },
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
            "TurboImage must set `resize` so the native decoder downsamples before the bitmap reaches memory. Decoding at full source resolution wastes memory - a 4000px photo in a 100pt avatar holds roughly 48MB of decoded pixels - and stalls the first frame. Pick a value slightly BELOW the rendered width, never above it: rounding down costs nothing visible, rounding up re-introduces the oversized decode the prop exists to avoid.",
        });
      },
    };
  },
};

const requireTurboImageCachePolicy = {
  meta: { type: "problem" },
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
