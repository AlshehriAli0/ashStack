import { problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const MESSAGE = "Use `stylex.props(...)` as JSX props or return/store its result.";

export const inlineProps: Rule = problem(MESSAGE, {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "props", bindings);
      },
      CallExpression(node) {
        if (!isStylexCall(context, node, "props", bindings)) return;
        if (
          ["JSXSpreadAttribute", "VariableDeclarator", "ReturnStatement", "ArrowFunctionExpression"].includes(
            node.parent.type
          )
        )
          return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
