import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const COMPONENTS_TSX_ONLY =
  "Move this file to `src/utils` (helpers, pure logic), `src/hooks` (a hook), or `src/api/<feature>/` (data access). `components/` holds only files that render JSX, plus a barrel.";

const isBarrel = (program: AstNode): boolean =>
  ((program.body as AstNode[] | undefined) ?? []).every(
    statement =>
      statement.type === "ImportDeclaration" ||
      statement.type === "ExportAllDeclaration" ||
      (statement.type === "ExportNamedDeclaration" && statement.declaration == null)
  );

// Scope this with an override on the components glob. It fires on a file that
// renders no JSX and is not a barrel, so a component file is never flagged even
// when the rule is left on everywhere.
export const componentsTsxOnly: Rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Reports a file that renders no JSX and is not a re-export barrel. Scope it to `components/`.",
    },
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    let sawJsx = false;
    return {
      before() {
        sawJsx = false;
      },
      JSXElement() {
        sawJsx = true;
      },
      JSXFragment() {
        sawJsx = true;
      },
      "Program:exit"(node: AstNode) {
        if (sawJsx || isBarrel(node)) return;
        context.report({ node, message: COMPONENTS_TSX_ONLY });
      },
    };
  },
};
