import { problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";
import { isPeerFile } from "./peer.js";

const MESSAGE = "Spread `stylex.props(...)` in JSX or return its full result; do not store it.";

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
        if (["JSXSpreadAttribute", "ReturnStatement", "ArrowFunctionExpression"].includes(node.parent.type)) return;
        if (isPeerFile(context) && node.parent.type === "VariableDeclarator") return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
