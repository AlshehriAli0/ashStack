import type { AstNode, RuleContext } from "../../../lib/types.js";

const SOURCES = new Set(["@stylexjs/stylex", "stylex"]);
export interface Bindings {
  namespaces: Set<string>;
  named: Set<string>;
}

export const collectImports = (statements: AstNode[], method: string, bindings: Bindings): void => {
  for (const statement of statements) {
    if (statement.type !== "ImportDeclaration" || !SOURCES.has(statement.source.value)) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportNamespaceSpecifier") bindings.namespaces.add(specifier.local.name);
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier" &&
        specifier.imported.name === method
      )
        bindings.named.add(specifier.local.name);
    }
  }
};

export const isStylexCall = (context: RuleContext, node: AstNode, method: string, bindings: Bindings): boolean => {
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  let identifier: AstNode | null = null;
  if (callee.type === "Identifier") identifier = callee;
  if (callee.type === "MemberExpression") identifier = callee.object;
  if (identifier?.type !== "Identifier") return false;
  const matches =
    (callee.type === "Identifier" && bindings.named.has(identifier.name)) ||
    (callee.type === "MemberExpression" &&
      !callee.computed &&
      bindings.namespaces.has(identifier.name) &&
      callee.property.type === "Identifier" &&
      callee.property.name === method);
  if (!matches) return false;
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(identifier);
  while (scope) {
    const binding = scope.set.get(identifier.name);
    if (binding) return binding.defs.some(definition => definition.type === "ImportBinding");
    scope = scope.upper;
  }
  return false;
};
