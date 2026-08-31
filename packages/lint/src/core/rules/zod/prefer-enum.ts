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
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return false;
  const object = callee.object as AstNode | undefined;
  if (object?.type !== "Identifier" || object.name !== "z") return false;
  return (callee.property as AstNode | undefined)?.name === method;
};

const isStringLiteralCall = (node: AstNode | null | undefined): boolean => {
  if (!isZodCall(node, "literal")) return false;
  const args = node?.arguments as AstNode[] | undefined;
  if (args?.length !== 1) return false;
  const first = args[0] as AstNode | undefined;
  return first?.type === "Literal" && typeof first.value === "string";
};

export const preferEnum: Rule = problem(
  "Matches `z.nativeEnum()` calls and any `z.union()` whose members are all `z.literal()` strings.",
  {
    createOnce(context: RuleContext) {
      return {
        CallExpression(node: AstNode) {
          if (isZodCall(node, "nativeEnum")) {
            context.report({ node, message: MESSAGES.nativeEnum });
            return;
          }
          if (!isZodCall(node, "union")) return;
          const members = (node.arguments as AstNode[] | undefined)?.[0];
          if (members?.type !== "ArrayExpression") return;
          const elements = (members.elements as (AstNode | null)[] | undefined) ?? [];
          if (elements.length === 0 || !elements.every(element => isStringLiteralCall(element))) return;
          context.report({ node, message: MESSAGES.literalUnion });
        },
      };
    },
  }
);
