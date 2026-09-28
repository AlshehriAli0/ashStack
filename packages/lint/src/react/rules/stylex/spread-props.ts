import { attributeName, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { collectImports, isImportedBinding, isStylexCall } from "./imports.js";

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

export const spreadProps: Rule = problem("Spread complete `stylex.props(...)` results to style custom components.", {
  meta: { hasSuggestions: true },
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

    const isDirectStyle = (node: AstNode): boolean => {
      if (node.type === "ArrayExpression") return node.elements.every(item => item === null || isDirectStyle(item));
      if (node.type === "LogicalExpression" && node.operator === "&&") return isDirectStyle(node.right);
      if (node.type === "ConditionalExpression") return isDirectStyle(node.consequent) && isDirectStyle(node.alternate);
      if (node.type === "Literal") return node.value === null || node.value === false;
      if (node.type === "CallExpression") return isDirectStyle(node.callee);
      if (node.type !== "MemberExpression") return false;
      const init = initializerOf(context, node.object);
      return init !== null && isStylexCall(context, init, "create", createBindings);
    };

    const isVisibleImport = (node: AstNode, name: string): boolean => {
      let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(name);
        if (variable)
          return variable.defs.some(definition => {
            if (definition.type !== "ImportBinding") return false;
            const specifier = definition.node;
            return (
              specifier.parent?.type === "ImportDeclaration" &&
              specifier.parent.importKind !== "type" &&
              (specifier.type !== "ImportSpecifier" || specifier.importKind !== "type")
            );
          });
        scope = scope.upper;
      }
      return false;
    };

    const propsCallee = (node: AstNode): string | null => {
      for (const name of propsBindings.namespaces) if (isVisibleImport(node, name)) return `${name}.props`;
      for (const name of propsBindings.named) if (isVisibleImport(node, name)) return name;
      return null;
    };

    const replacementFor = (element: AstNode, attribute: AstNode, expression: AstNode, name: string): string | null => {
      if (/^[a-z][a-zA-Z0-9]*Sx$/.test(name) || element.type !== "JSXOpeningElement") return null;
      if (
        element.attributes.some(
          other =>
            other !== attribute &&
            (other.type === "JSXSpreadAttribute" || ["className", "style"].includes(attributeName(other)))
        )
      )
        return null;
      if (expression.type === "MemberExpression" && !expression.computed && expression.property.type === "Identifier") {
        const { object, property } = expression;
        if (
          object.type === "CallExpression" &&
          ["className", "style"].includes(property.name) &&
          isStylexCall(context, object, "props", propsBindings)
        )
          return context.sourceCode.getText(object);
      }
      const callee = propsCallee(attribute);
      return callee && isDirectStyle(expression) ? `${callee}(${context.sourceCode.getText(expression)})` : null;
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
        context.report({
          node: node.key,
          message: "Spread `stylex.props(...)` at the call site instead of defining a StyleX style prop.",
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
          if (attribute.type === "JSXSpreadAttribute") continue;
          seen.clear();
          const name = attributeName(attribute);
          if (attribute.value?.type !== "JSXExpressionContainer") continue;
          const expression = attribute.value.expression;
          if (!fromStylex(expression, name === "className")) continue;
          const replacement = replacementFor(node, attribute, expression, name);
          context.report({
            node: attribute,
            message: `Spread \`stylex.props(...)\` on this component instead of passing a StyleX style as \`${name}\`.`,
            suggest:
              replacement === null
                ? undefined
                : [
                    {
                      desc: "Spread complete StyleX props",
                      fix: fixer => fixer.replaceText(attribute, `{...${replacement}}`),
                    },
                  ],
          });
        }
      },
    };
  },
});
