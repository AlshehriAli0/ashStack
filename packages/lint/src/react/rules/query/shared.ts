// Bits two or more query rules need: the source-text view used to gate a file
// and to read a property value back as text, plus property-key naming.
import type { AstNode, RuleContext } from "../../../lib/types.js";

export type SourceContext = RuleContext & {
  sourceCode?: { text?: string; getText?: (node?: AstNode) => string };
};

export const propertyKeyName = (node: AstNode): string => {
  const key = node.key as AstNode | undefined;
  if (key?.type === "Identifier") return key.name as string;
  if (key?.type === "Literal") return String(key.value);
  return "";
};
