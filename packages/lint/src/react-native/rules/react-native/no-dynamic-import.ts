import { calleeName, gate, hasAncestor, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import type { RnContext } from "./shared.js";

const LAZY_WRAPPERS = new Set(["lazy", "dynamic"]);

const MESSAGE =
  "Turn this into a static `import` at the top of the file. Metro inlines `import()` into the same bundle, so it buys no laziness and only hides the module from the typechecker; wrapping it in `React.lazy(() => import(...))` or `dynamic(() => import(...))` stays allowed.";

export const noDynamicImport: Rule = problem(
  "Bans dynamic `import()` outside a `React.lazy` or `dynamic` wrapper. Metro inlines it into the same bundle, so nothing is deferred and the module is hidden from the typechecker.",
  {
    createOnce(context: RnContext) {
      return {
        before() {
          return gate(context, "import(");
        },
        ImportExpression(node) {
          if (
            hasAncestor(node, current => current.type === "CallExpression" && LAZY_WRAPPERS.has(calleeName(current)))
          ) {
            return;
          }
          context.report({ node, message: MESSAGE });
        },
      };
    },
  }
);
