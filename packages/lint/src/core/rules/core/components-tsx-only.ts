import { optionsOf } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const COMPONENTS_TSX_ONLY =
  "Move this file to `src/utils`, `src/hooks`, or `src/api/<feature>/` — `components/` holds only files that render JSX.";

const DEFAULT_DIR = "src/components";

interface Options {
  dir?: string;
}

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
      description:
        "Require every file under the components directory to render JSX or be a re-export barrel. `dir` says which directory, defaulting to `src/components`.",
    },
    schema: [{ type: "object", properties: { dir: { type: "string", minLength: 1 } }, additionalProperties: false }],
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    let rendersJsx = false;
    return {
      before() {
        rendersJsx = false;
        const { dir = DEFAULT_DIR } = optionsOf<Options>(context, {});
        return context.filename.replaceAll("\\", "/").includes(`/${dir}/`);
      },
      JSXElement() {
        rendersJsx = true;
      },
      JSXFragment() {
        rendersJsx = true;
      },
      "Program:exit"(node) {
        if (rendersJsx || isBarrel(node.body)) return;
        context.report({ node, message: COMPONENTS_TSX_ONLY });
      },
    };
  },
};
