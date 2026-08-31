import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { factoryCalled, OBS, type GateContext } from "./shared.js";

export const naming: Rule = problem(
  "A variable initialized from `observable()` or `useObservable()` needs a trailing `$`. The other rules in this module key off that suffix.",
  {
    createOnce(context: GateContext) {
      return {
        before() {
          return gate(context, "observable(", "useObservable(");
        },
        VariableDeclarator(node) {
          const factory = factoryCalled(node.init as AstNode | undefined);
          const id = node.id as AstNode | undefined;
          if (!factory || id?.type !== "Identifier") return;
          const name = id.name as string;
          if (OBS.test(name)) return;
          context.report({
            node: id,
            message: `Rename this to \`${name}$\`. The trailing \`$\` is how a reader tells an observable from a plain value, and every other observable rule keys off it.`,
          });
        },
      };
    },
  }
);
