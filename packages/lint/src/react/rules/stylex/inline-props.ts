import { attributeName, findInSubtree, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const MESSAGE = "Use `stylex.props(...)` as JSX props or return/store its result.";
const CLASS_NAME_MESSAGE =
  "Pass StyleX styles through `sx` or spread the full `stylex.props(...)` result; `className` alone can drop inline styles.";

const storedPropsCall = (context: RuleContext, node: AstNode): AstNode | null => {
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

const isMember = (node: AstNode, object: string, property: string): boolean =>
  node.type === "MemberExpression" &&
  !node.computed &&
  node.object.type === "Identifier" &&
  node.object.name === object &&
  node.property.type === "Identifier" &&
  node.property.name === property;

export const inlineProps: Rule = problem("Use complete StyleX props in JSX; a className-only bridge can drop inline styles.", {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "props", bindings);
      },
      CallExpression(node) {
        if (!isStylexCall(context, node, "props", bindings)) return;
        if (
          ["JSXSpreadAttribute", "VariableDeclarator", "ReturnStatement", "ArrowFunctionExpression"].includes(
            node.parent.type
          )
        )
          return;
        context.report({ node, message: MESSAGE });
      },
      JSXOpeningElement(node) {
        for (const attribute of node.attributes) {
          if (
            attribute.type !== "JSXAttribute" ||
            attributeName(attribute) !== "className" ||
            attribute.value?.type !== "JSXExpressionContainer"
          )
            continue;
          const member = findInSubtree(attribute.value.expression, child => {
            if (child.type !== "MemberExpression" || child.object.type !== "Identifier") return false;
            if (!isMember(child, child.object.name, "className")) return false;
            const call = storedPropsCall(context, child.object);
            return call !== null && isStylexCall(context, call, "props", bindings);
          });
          if (member?.type !== "MemberExpression" || member.object.type !== "Identifier") continue;
          const owner = member.object.name;
          const forwarded = node.attributes.some(other => {
            if (other.type === "JSXSpreadAttribute")
              return other.argument.type === "Identifier" && other.argument.name === owner;
            return (
              attributeName(other) === "style" &&
              other.value?.type === "JSXExpressionContainer" &&
              isMember(other.value.expression, owner, "style")
            );
          });
          if (!forwarded) context.report({ node: attribute, message: CLASS_NAME_MESSAGE });
        }
      },
    };
  },
});
