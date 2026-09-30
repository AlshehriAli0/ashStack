import { optionsOf, problem } from "../../../lib/ast.js";
import {
  DESIGN_SYSTEM_SCHEMA,
  designSystemFolders,
  isInsideDesignSystem,
  type DesignSystemOptions,
} from "../../../lib/design-system.js";
import type { Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const MESSAGE = "Spread `stylex.props(...)` in JSX or return its full result; do not store it.";

export const inlineProps: Rule = problem(MESSAGE, {
  meta: { schema: [DESIGN_SYSTEM_SCHEMA] },
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };
    let folders: string[] = [];

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        folders = designSystemFolders(optionsOf<DesignSystemOptions>(context, {}));
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "props", bindings);
      },
      CallExpression(node) {
        if (!isStylexCall(context, node, "props", bindings)) return;
        if (["JSXSpreadAttribute", "ReturnStatement", "ArrowFunctionExpression"].includes(node.parent.type)) return;
        if (isInsideDesignSystem(context.filename, folders) && node.parent.type === "VariableDeclarator") return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
