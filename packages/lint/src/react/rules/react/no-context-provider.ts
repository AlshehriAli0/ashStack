import { bindImport, callsBinding, emptyBinding, gate, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

export const noContextProvider: Rule = problem(
  "Disallow `<Context.Provider>` for a context made by React's `createContext`. React 19 renders the context itself as the provider, and `.Provider` is deprecated.",
  {
    createOnce(context: RuleContext) {
      let react = emptyBinding();
      const contexts = new Set<string>();
      return {
        before() {
          react = emptyBinding();
          contexts.clear();
          return gate(context, ".Provider");
        },
        ImportDeclaration(node) {
          bindImport(react, node, "react", "createContext");
        },
        VariableDeclarator(node) {
          if (node.id.type === "Identifier" && callsBinding(node.init, react, "createContext")) {
            contexts.add(node.id.name);
          }
        },
        JSXOpeningElement(node) {
          const { name } = node;
          if (name.type !== "JSXMemberExpression" || name.property.name !== "Provider") return;
          if (name.object.type !== "JSXIdentifier" || !contexts.has(name.object.name)) return;
          const contextName = name.object.name;
          context.report({
            node: name,
            message: `Render \`<${contextName} value={…}>\` instead of \`<${contextName}.Provider>\`. React 19 makes the context its own provider, and \`.Provider\` is deprecated.`,
          });
        },
      };
    },
  }
);
