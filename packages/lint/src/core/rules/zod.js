// @ashstack/lint — Zod conventions.

const MESSAGES = {
  nativeEnum:
    "Call `z.enum()` here — it takes the same native enum object and params, and `z.nativeEnum()` is deprecated in Zod 4.",
  literalUnion:
    "Replace this union with `z.enum([...])` listing the same string values, so invalid input reports one issue and the options stay reusable.",
};

const isZodCall = (node, method) =>
  node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "z" &&
  node.callee.property?.name === method;

const isStringLiteralCall = node =>
  isZodCall(node, "literal") &&
  node.arguments?.length === 1 &&
  node.arguments[0]?.type === "Literal" &&
  typeof node.arguments[0].value === "string";

const preferEnum = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `z.enum()` in place of the deprecated `z.nativeEnum()` and of a `z.union()` of string literals, so a closed set reports one issue and its options stay reusable.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (isZodCall(node, "nativeEnum")) {
          context.report({ node, message: MESSAGES.nativeEnum });
          return;
        }
        if (!isZodCall(node, "union")) return;
        const members = node.arguments?.[0];
        if (members?.type !== "ArrayExpression") return;
        const elements = members.elements ?? [];
        if (elements.length === 0 || !elements.every(isStringLiteralCall)) return;
        context.report({ node, message: MESSAGES.literalUnion });
      },
    };
  },
};

export default {
  meta: { name: "@ashstack/zod" },
  rules: {
    "prefer-enum": preferEnum,
  },
};
