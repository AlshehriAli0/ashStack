import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BARE_TOAST = 'Pass `t("<key>")` to this toast instead of the literal, and add the key to every locale file.';

const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);

const isToastCall = (node: AstNode): boolean => {
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type !== "MemberExpression") return false;
  const { object, property } = callee;
  if (object.type !== "Identifier" || object.name !== "toast") return false;
  return property.type === "Identifier" && TOAST_METHODS.has(property.name);
};

const onlyStringArgument = (node: AstNode): AstNode | undefined => {
  if (node.type !== "CallExpression" || node.arguments.length !== 1) return undefined;
  const [argument] = node.arguments;
  if (argument?.type !== "Literal" || typeof argument.value !== "string") return undefined;
  return argument;
};

export const noBareToast: Rule = problem("Matches a `toast.*` call whose only argument is a string literal.", {
  createOnce(context: RuleContext) {
    return {
      CallExpression(node) {
        if (!isToastCall(node)) return;
        const argument = onlyStringArgument(node);
        if (argument === undefined) return;
        context.report({ node: argument, message: BARE_TOAST });
      },
    };
  },
});
