import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { collectImports, isImportedBinding } from "./imports.js";

const SLOT_SX = /^[a-z][a-zA-Z0-9]*Sx$/;

export const useSxProp: Rule = problem("Name StyleX override props `sx` or `<slot>Sx`.", {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };

    const hasStyleXStyles = (node: AstNode): boolean => {
      if (node.type === "TSTypeReference") {
        const name = node.typeName;
        if (name.type === "Identifier") return bindings.named.has(name.name) && isImportedBinding(context, name);
        return (
          name.type === "TSQualifiedName" &&
          name.left.type === "Identifier" &&
          bindings.namespaces.has(name.left.name) &&
          (name.right.name === "StyleXStyles" || name.right.name === "StyleXStylesWithout") &&
          isImportedBinding(context, name.left)
        );
      }
      if (node.type === "TSUnionType" || node.type === "TSIntersectionType") return node.types.some(hasStyleXStyles);
      if (node.type === "TSParenthesizedType") return hasStyleXStyles(node.typeAnnotation);
      return false;
    };

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        return context.sourceCode.text.includes("StyleXStyles");
      },
      Program(node) {
        collectImports(node.body, "StyleXStyles", bindings);
        collectImports(node.body, "StyleXStylesWithout", bindings);
      },
      TSPropertySignature(node) {
        if (bindings.named.size === 0 && bindings.namespaces.size === 0) return;
        if (node.computed || !node.typeAnnotation || !hasStyleXStyles(node.typeAnnotation.typeAnnotation)) return;
        let name: string | null = null;
        if (node.key.type === "Identifier") name = node.key.name;
        if (node.key.type === "Literal" && typeof node.key.value === "string") name = node.key.value;
        if (name === null || name === "sx" || SLOT_SX.test(name)) return;
        const suggested = name.startsWith("style") ? "sx" : `${name.replace(/Style$/, "")}Sx`;
        context.report({
          node: node.key,
          message: `Rename \`${name}\` to \`${suggested}\` for a StyleX override prop.`,
        });
      },
    };
  },
});
