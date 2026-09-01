import type { AstNode, RuleContext } from "../../../lib/types.js";

/**
 * A rule context that can read source text: `text` is the whole file, which
 * `gate()` scans to skip files outright, and `getText` reads one node back.
 */
export type SourceContext = RuleContext & {
  sourceCode?: { text?: string; getText?: (node?: AstNode) => string };
};

export const propertyKeyName = (node: AstNode): string => {
  const key = node.key as AstNode | undefined;
  if (key?.type === "Identifier") return key.name as string;
  if (key?.type === "Literal") return String(key.value);
  return "";
};
