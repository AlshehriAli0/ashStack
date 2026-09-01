import type { AstNode } from "../../../lib/types.js";

export const propertyKeyName = (node: AstNode): string => {
  if (node.type !== "Property" || node.computed) return "";
  const { key } = node;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return "";
};
