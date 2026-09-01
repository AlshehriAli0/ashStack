import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGES = {
  nativeEnum:
    "Call `z.enum()` here — it takes the same native enum object and params, and `z.nativeEnum()` is deprecated in Zod 4.",
  literalUnion:
    "Replace this union with `z.enum([...])` listing the same string values, so invalid input reports one issue and the options stay reusable.",
};

const isZodCall = (node: AstNode | null | undefined, method: string): boolean => {
  if (node?.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  const { object, property } = callee;
  if (object.type !== "Identifier" || object.name !== "z") return false;
  return property.type === "Identifier" && property.name === method;
};

const isStringLiteralCall = (node: AstNode | null | undefined): boolean => {
  if (node?.type !== "CallExpression" || !isZodCall(node, "literal")) return false;
  const args = node.arguments;
  if (args.length !== 1) return false;
  const [first] = args;
  return first?.type === "Literal" && typeof first.value === "string";
};

export const preferEnum: Rule = problem(
  "Matches `z.nativeEnum()` calls and any `z.union()` whose members are all `z.literal()` strings.",
  {
    createOnce(context: RuleContext) {
      return {
        CallExpression(node) {
          if (isZodCall(node, "nativeEnum")) {
            context.report({ node, message: MESSAGES.nativeEnum });
            return;
          }
          if (!isZodCall(node, "union")) return;
          const [members] = node.arguments;
          if (members?.type !== "ArrayExpression") return;
          const { elements } = members;
          if (elements.length === 0 || !elements.every(element => isStringLiteralCall(element))) return;
          context.report({ node, message: MESSAGES.literalUnion });
        },
      };
    },
  }
);
