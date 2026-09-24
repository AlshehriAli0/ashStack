import { problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const MESSAGE = "Spread `stylex.props(...)` directly on this element.";

export const inlineProps: Rule = problem("Spread `stylex.props(...)` directly on JSX elements.", {
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
        if (node.parent.type === "JSXSpreadAttribute") return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
