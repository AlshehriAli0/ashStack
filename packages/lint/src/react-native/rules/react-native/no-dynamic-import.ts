import { gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const MESSAGE =
  "Turn this into a static `import`, or a `require` at first use for a heavy module — Metro inlines `import()` into the same bundle, so it buys no laziness.";

export const noDynamicImport: Rule = problem(
  "Disallow dynamic `import()`. Metro inlines it into the same bundle, so nothing is deferred and the module is hidden from the typechecker.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "import(");
        },
        ImportExpression(node) {
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
