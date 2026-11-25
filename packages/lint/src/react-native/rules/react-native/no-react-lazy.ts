import { bindImport, callsBinding, emptyBinding, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const NO_REACT_LAZY =
  "Import this component statically, or `require` a heavy one at first use. The router already loads each screen lazily, and the Suspense boundary `lazy` adds holds a blank fallback for up to 300ms and can loop rendering forever inside a frozen screen.";

export const noReactLazy: Rule = problem(
  "Disallow `lazy` and `React.lazy` from `react`. The router already loads screens lazily, and the Suspense boundary `lazy` adds holds its fallback for up to 300ms and can loop forever inside a frozen screen.",
  {
    createOnce(context: RuleContext) {
      let react = emptyBinding();
      return {
        before() {
          react = emptyBinding();
          return gate(context, "lazy");
        },
        ImportDeclaration(node) {
          bindImport(react, node, "react", "lazy");
        },
        CallExpression(node) {
          if (callsBinding(node, react, "lazy")) context.report({ node, message: NO_REACT_LAZY });
        },
      };
    },
  }
);
