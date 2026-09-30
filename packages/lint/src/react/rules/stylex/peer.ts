import type { AstNode, RuleContext } from "../../../lib/types.js";
import { isStylexCall, type Bindings } from "./imports.js";

export const initializerOf = (context: RuleContext, node: AstNode): AstNode | null => {
  if (node.type !== "Identifier") return null;
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) {
      const declaration = variable.defs.find(definition => definition.node.type === "VariableDeclarator")?.node;
      return declaration?.type === "VariableDeclarator" ? (declaration.init ?? null) : null;
    }
    scope = scope.upper;
  }
  return null;
};

const PEER_DIR = "components/ui/";

/** Whether a module path or import specifier points into the peer component folder.
 *  ponytail: substring match, so a folder-relative ./button inside components/ui/ is not resolved. */
export const isPeerSource = (source: string): boolean => source.replaceAll("\\", "/").includes(PEER_DIR);

export const isPeerFile = (context: RuleContext): boolean => isPeerSource(context.filename);

const rootIdentifier = (node: AstNode): AstNode | null => {
  let current = node;
  while (current.type === "MemberExpression") {
    if (current.computed) return null;
    current = current.object;
  }
  return current.type === "Identifier" ? current : null;
};

const isStoredPropsRead = (context: RuleContext, node: AstNode, props: Bindings): boolean => {
  if (node.type !== "MemberExpression" || node.computed || node.property.type !== "Identifier") return false;
  if (node.property.name !== "className" && node.property.name !== "style") return false;
  const root = rootIdentifier(node);
  if (root === null) return false;
  const init = initializerOf(context, root);
  return init !== null && isStylexCall(context, init, "props", props);
};

const containsStoredRead = (context: RuleContext, node: AstNode, props: Bindings): boolean => {
  if (node.type === "MemberExpression") return isStoredPropsRead(context, node, props);
  if (node.type === "CallExpression")
    return node.arguments.some(argument =>
      containsStoredRead(context, argument.type === "SpreadElement" ? argument.argument : argument, props)
    );
  if (node.type === "ArrayExpression")
    return node.elements.some(
      element =>
        element !== null &&
        containsStoredRead(context, element.type === "SpreadElement" ? element.argument : element, props)
    );
  if (node.type === "ConditionalExpression")
    return containsStoredRead(context, node.consequent, props) || containsStoredRead(context, node.alternate, props);
  if (node.type === "LogicalExpression")
    return containsStoredRead(context, node.left, props) || containsStoredRead(context, node.right, props);
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression" || node.type === "TSNonNullExpression")
    return containsStoredRead(context, node.expression, props);
  return false;
};

export const mergesStoredProps = (context: RuleContext, expression: AstNode, props: Bindings): boolean => {
  if (expression.type !== "CallExpression") return false;
  const args = expression.arguments.map(argument => (argument.type === "SpreadElement" ? argument.argument : argument));
  return (
    args.some(argument => containsStoredRead(context, argument, props)) &&
    args.some(argument => !containsStoredRead(context, argument, props))
  );
};
