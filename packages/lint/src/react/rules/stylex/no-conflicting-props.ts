import { attributeName, problem, propertyKeyName, propertyValue, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

type Spread = { call: AstNode; storedName: string | null };

const addMemberStyleNames = (node: AstNode, styles: Map<string, AstNode>, names: Set<string>): void => {
  if (node.type !== "MemberExpression" || node.computed) return;
  if (node.object.type !== "Identifier" || node.property.type !== "Identifier") return;
  const style = propertyValue(styles.get(node.object.name), node.property.name);
  if (style?.type !== "ObjectExpression") return;
  for (const property of style.properties) {
    const name = propertyKeyName(property);
    if (name) names.add(name);
  }
};

const addStyleNames = (node: AstNode, styles: Map<string, AstNode>, names: Set<string>): void => {
  if (node.type === "MemberExpression") addMemberStyleNames(node, styles, names);
  else if (node.type === "ArrayExpression") {
    for (const item of node.elements) if (item) addStyleNames(item, styles, names);
  } else if (node.type === "LogicalExpression") addStyleNames(node.right, styles, names);
  else if (node.type === "ConditionalExpression") {
    addStyleNames(node.consequent, styles, names);
    addStyleNames(node.alternate, styles, names);
  }
};

export const noConflictingProps: Rule = problem(
  "Report className overrides and inline CSS that overlaps StyleX declarations.",
  {
    createOnce(context) {
      const creates = { namespaces: new Set<string>(), named: new Set<string>() };
      const props = { namespaces: new Set<string>(), named: new Set<string>() };
      const styles = new Map<string, AstNode>();
      const stored = new Map<string, AstNode>();
      const elements: AstNode[] = [];

      const spreadOf = (attribute: AstNode): Spread | null => {
        if (attribute.type !== "JSXSpreadAttribute") return null;
        const storedName = attribute.argument.type === "Identifier" ? attribute.argument.name : null;
        const value = storedName ? stored.get(storedName) : attribute.argument;
        return value?.type === "CallExpression" && isStylexCall(context, value, "props", props)
          ? { call: value, storedName }
          : null;
      };

      const checkClassName = (attribute: AstNode, spreads: Spread[]): void => {
        if (attribute.type !== "JSXAttribute") return;
        const value = attribute.value;
        const merges =
          value?.type === "JSXExpressionContainer" &&
          subtreeHas(value.expression, child => {
            if (child.type !== "MemberExpression" || child.object.type !== "Identifier") return false;
            const owner = child.object.name;
            return (
              child.property.type === "Identifier" &&
              child.property.name === "className" &&
              spreads.some(spread => spread.storedName === owner)
            );
          });
        if (!merges) context.report({ node: attribute, message: "`className` overrides StyleX classes." });
      };

      const checkInlineStyle = (attribute: AstNode, spreads: Spread[]): void => {
        if (attribute.type !== "JSXAttribute" || attribute.value?.type !== "JSXExpressionContainer") return;
        const value = attribute.value.expression;
        if (value.type !== "ObjectExpression") return;
        const declared = new Set<string>();
        for (const { call } of spreads) {
          if (call.type === "CallExpression")
            for (const argument of call.arguments) addStyleNames(argument, styles, declared);
        }
        for (const property of value.properties) {
          const name = propertyKeyName(property);
          if (declared.has(name))
            context.report({ node: property, message: `Inline \`${name}\` overlaps a StyleX declaration.` });
        }
      };

      const checkElement = (node: AstNode): void => {
        if (node.type !== "JSXOpeningElement") return;
        const spreads: Spread[] = [];
        for (const attribute of node.attributes) {
          const spread = spreadOf(attribute);
          if (spread) spreads.push(spread);
        }
        if (spreads.length === 0) return;
        for (const attribute of node.attributes) {
          const name = attributeName(attribute);
          if (name === "className") checkClassName(attribute, spreads);
          if (name === "style") checkInlineStyle(attribute, spreads);
        }
      };

      return {
        before() {
          creates.namespaces.clear();
          creates.named.clear();
          props.namespaces.clear();
          props.named.clear();
          styles.clear();
          stored.clear();
          elements.length = 0;
          return context.sourceCode.text.includes("stylex");
        },
        Program(node) {
          collectImports(node.body, "create", creates);
          collectImports(node.body, "props", props);
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || node.init?.type !== "CallExpression") return;
          if (isStylexCall(context, node.init, "props", props)) stored.set(node.id.name, node.init);
          if (!isStylexCall(context, node.init, "create", creates)) return;
          const root = node.init.arguments[0];
          if (root?.type === "ObjectExpression") styles.set(node.id.name, root);
        },
        JSXOpeningElement(node) {
          if (node.attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) elements.push(node);
        },
        "Program:exit"() {
          elements.forEach(checkElement);
        },
      };
    },
  }
);
