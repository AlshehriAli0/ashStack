import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BARE_TOAST = 'Pass `t("<key>")` to this toast instead of the literal, and add the key to every locale file.';

const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);

export const noBareToast: Rule = problem("Matches a `toast.*` call whose only argument is a string literal.", {
  createOnce(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== "MemberExpression") return;
        const object = callee.object as AstNode | undefined;
        if (object?.type !== "Identifier" || object.name !== "toast") return;
        if (!TOAST_METHODS.has(((callee.property as AstNode | undefined)?.name as string | undefined) ?? "")) return;
        const args = (node.arguments as AstNode[] | undefined) ?? [];
        if (args.length !== 1) return;
        const argument = args[0] as AstNode | undefined;
        if (argument?.type !== "Literal" || typeof argument.value !== "string") return;
        context.report({ node: argument, message: BARE_TOAST });
      },
    };
  },
});
