import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const COMPONENTS_TSX_ONLY =
  "Move this file to `src/utils` (helpers, pure logic), `src/hooks` (a hook), or `src/api/<feature>/` (data access). `components/` holds only files that render JSX, plus a barrel.";

const isBarrel = (body: AstNode[]): boolean =>
  body.every(
    statement =>
      statement.type === "ImportDeclaration" ||
      statement.type === "ExportAllDeclaration" ||
      (statement.type === "ExportNamedDeclaration" && statement.declaration == null)
  );

export const componentsTsxOnly: Rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Reports a file that renders no JSX and is not a re-export barrel. Scope it to `components/`.",
    },
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    let rendersJsx = false;
    return {
      before() {
        rendersJsx = false;
      },
      JSXElement() {
        rendersJsx = true;
      },
      JSXFragment() {
        rendersJsx = true;
      },
      "Program:exit"(node: AstNode) {
        if (node.type !== "Program") return;
        if (rendersJsx || isBarrel(node.body)) return;
        context.report({ node, message: COMPONENTS_TSX_ONLY });
      },
    };
  },
};
