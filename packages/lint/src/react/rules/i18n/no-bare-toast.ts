import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BARE_TOAST = 'Pass `t("<key>")` to this toast instead of the literal, and add the key to every locale file.';

const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);

const isToastCall = (node: AstNode): boolean => {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return false;
  const object = callee.object as AstNode | undefined;
  if (object?.type !== "Identifier" || object.name !== "toast") return false;
  const method = ((callee.property as AstNode | undefined)?.name as string | undefined) ?? "";
  return TOAST_METHODS.has(method);
};

const onlyStringArgument = (node: AstNode): AstNode | undefined => {
  const args = (node.arguments as AstNode[] | undefined) ?? [];
  if (args.length !== 1) return undefined;
  const argument = args[0] as AstNode | undefined;
  if (argument?.type !== "Literal" || typeof argument.value !== "string") return undefined;
  return argument;
};

export const noBareToast: Rule = problem("Matches a `toast.*` call whose only argument is a string literal.", {
  createOnce(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        if (!isToastCall(node)) return;
        const argument = onlyStringArgument(node);
        if (argument === undefined) return;
        context.report({ node: argument, message: BARE_TOAST });
      },
    };
  },
});
