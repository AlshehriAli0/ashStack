import type { AstNode } from "../../../lib/types.js";

export const ROUTER_MODULE = "@tanstack/react-router";

/** Named imports from the router, as `imported` plus the local name they were bound to. */
export const importedAs = (node: AstNode): { imported: string; local: string }[] => {
  if (node.type !== "ImportDeclaration" || node.source.value !== ROUTER_MODULE) return [];
  const pairs: { imported: string; local: string }[] = [];
  for (const specifier of node.specifiers) {
    if (specifier.type !== "ImportSpecifier") continue;
    const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : "";
    if (imported !== "") pairs.push({ imported, local: specifier.local.name });
  }
  return pairs;
};
