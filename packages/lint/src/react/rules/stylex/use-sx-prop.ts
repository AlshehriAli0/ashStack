import { attributeName, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { collectImports, isImportedBinding, isStylexCall } from "./imports.js";

const SLOT_SX = /^[a-z][a-zA-Z0-9]*Sx$/;

const initializerOf = (context: RuleContext, node: AstNode): AstNode | null => {
  if (node.type !== "Identifier") return null;
  let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) {
      const declaration = variable.defs.find(definition => definition.node.type === "VariableDeclarator")?.node;
      return declaration?.type === "VariableDeclarator" ? (declaration.init ?? null) : null;
    }
    scope = scope.upper;
  }
  return null;
};

export const useSxProp: Rule = problem("Name StyleX override props `sx` or `<slot>Sx` and pass styles through them.", {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };
    const propsBindings = { namespaces: new Set<string>(), named: new Set<string>() };
    const createBindings = { namespaces: new Set<string>(), named: new Set<string>() };
    const seen = new Set<AstNode>();

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

    const fromStylex = (node: AstNode, traceCallArgs = false): boolean => {
      if (node.type === "Identifier") {
        const init = initializerOf(context, node);
        if (init === null || seen.has(init)) return false;
        seen.add(init);
        return fromStylex(init, traceCallArgs);
      }
      if (node.type === "MemberExpression") {
        const init = initializerOf(context, node.object);
        if (init !== null && isStylexCall(context, init, "create", createBindings)) return true;
        return fromStylex(node.object, traceCallArgs);
      }
      if (node.type === "CallExpression")
        return (
          isStylexCall(context, node, "props", propsBindings) ||
          fromStylex(node.callee, traceCallArgs) ||
          (traceCallArgs && node.arguments.some(argument => fromStylex(argument, true)))
        );
      return fromComposite(node, traceCallArgs);
    };

    const fromComposite = (node: AstNode, traceCallArgs: boolean): boolean => {
      if (node.type === "ArrayExpression")
        return node.elements.some(item => item !== null && fromStylex(item, traceCallArgs));
      if (node.type === "ObjectExpression")
        return node.properties.some(
          property => property.type === "Property" && fromStylex(property.value, traceCallArgs)
        );
      if (node.type === "ConditionalExpression")
        return fromStylex(node.consequent, traceCallArgs) || fromStylex(node.alternate, traceCallArgs);
      if (node.type === "LogicalExpression")
        return fromStylex(node.left, traceCallArgs) || fromStylex(node.right, traceCallArgs);
      if (node.type === "BinaryExpression")
        return fromStylex(node.left, traceCallArgs) || fromStylex(node.right, traceCallArgs);
      if (node.type === "TemplateLiteral")
        return node.expressions.some(expression => fromStylex(expression, traceCallArgs));
      if (node.type === "SpreadElement") return fromStylex(node.argument, traceCallArgs);
      if (node.type === "ChainExpression") return fromStylex(node.expression, traceCallArgs);
      if (
        node.type === "TSAsExpression" ||
        node.type === "TSSatisfiesExpression" ||
        node.type === "TSNonNullExpression"
      )
        return fromStylex(node.expression, traceCallArgs);
      return false;
    };

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        propsBindings.namespaces.clear();
        propsBindings.named.clear();
        createBindings.namespaces.clear();
        createBindings.named.clear();
        seen.clear();
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "StyleXStyles", bindings);
        collectImports(node.body, "StyleXStylesWithout", bindings);
        collectImports(node.body, "props", propsBindings);
        collectImports(node.body, "create", createBindings);
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
      JSXOpeningElement(node) {
        if (node.name.type === "JSXIdentifier" && !/^[A-Z]/.test(node.name.name)) return;
        if (
          !createBindings.namespaces.size &&
          !createBindings.named.size &&
          !propsBindings.namespaces.size &&
          !propsBindings.named.size
        )
          return;
        for (const attribute of node.attributes) {
          seen.clear();
          if (attribute.type === "JSXSpreadAttribute") {
            if (fromStylex(attribute.argument))
              context.report({ node: attribute, message: "Pass StyleX styles as `sx` to this component." });
            continue;
          }
          const name = attributeName(attribute);
          if (name === "sx" || SLOT_SX.test(name) || attribute.value?.type !== "JSXExpressionContainer") continue;
          if (fromStylex(attribute.value.expression, name === "className"))
            context.report({
              node: attribute,
              message: `Pass this StyleX style as \`sx\` or a named \`<slot>Sx\` prop, not \`${name}\`.`,
            });
        }
      },
    };
  },
});
