import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, type GateContext } from "./shared.js";

const MESSAGE =
  "Compose styles with an array — `[styles.a, styles.b]` — instead of spreading. A spread reads the object once and breaks the Unistyles C++ proxy, so the style silently stops reacting to the theme.";

const spreadBase = (node: AstNode | null | undefined): string => {
  let current: AstNode | undefined = node ?? undefined;
  while (current?.type === "MemberExpression") current = current.object as AstNode | undefined;
  return current?.type === "Identifier" ? (current.name as string) : "";
};

export const noStyleSpread: Rule = problem(
  "Disallow spreading a stylesheet style into another object. The spread reads through the Unistyles C++ proxy once, so the result stops reacting to the theme.",
  {
    createOnce(context: GateContext) {
      const sheets = new Set<string>();
      const candidates: { node: AstNode; base: string }[] = [];
      return {
        before() {
          sheets.clear();
          candidates.length = 0;
          return gate(context, "...");
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          if (id?.type === "Identifier" && isStyleSheetCreate(node.init as AstNode | undefined)) {
            sheets.add(id.name as string);
          }
        },
        SpreadElement(node) {
          const base = spreadBase(node.argument as AstNode | undefined);
          if (base !== "") candidates.push({ node, base });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!sheets.has(candidate.base) && !/[Ss]tyles$/.test(candidate.base)) continue;
            context.report({ node: candidate.node, message: MESSAGE });
          }
        },
      };
    },
  }
);
