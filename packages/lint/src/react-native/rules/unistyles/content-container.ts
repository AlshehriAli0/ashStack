import { calleeName, findInSubtree, gate, problem, subtreeHas, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, memberPath, propertyName, stylesObjectOf } from "./shared.js";

const MESSAGES = {
  contentContainerRuntime:
    "Wrap this component with `withUnistyles`, or pass `contentContainerStyle` a hook-fed style — on a raw component it never subscribes to Unistyles updates.",
  contentContainerTheme:
    "Wrap this component with `withUnistyles`, or pass `contentContainerStyle` a hook-fed style — on a raw component it never subscribes to theme changes.",
};

export const contentContainer: Rule = problem(
  "A raw component never subscribes its `contentContainerStyle` to theme or `rt` updates. Wrap the component with `withUnistyles` when the style depends on either.",
  {
    createOnce(context) {
      const sheetStyles = new Map<string, Map<string, AstNode>>();
      const wrapped = new Set<string>();
      const attributes: Extract<AstNode, { type: "JSXAttribute" }>[] = [];

      /** What one `contentContainerStyle` earns, or null when the style it names depends on neither. */
      const complaintFor = (attribute: Extract<AstNode, { type: "JSXAttribute" }>): string | null => {
        const reference = findInSubtree(
          attribute.value,
          current =>
            current.type === "MemberExpression" &&
            current.object.type === "Identifier" &&
            sheetStyles.has(current.object.name)
        );
        if (reference?.type !== "MemberExpression") return null;

        const owner = attribute.parent;
        if (owner.type === "JSXOpeningElement" && wrapped.has(tagIdentifier(owner.name))) return null;

        const { object, property } = reference;
        if (object.type !== "Identifier") return null;
        const definition = sheetStyles.get(object.name)?.get(property.type === "Identifier" ? property.name : "");
        if (!definition) return null;

        const reads = (prefix: string): boolean =>
          subtreeHas(
            definition,
            current => current.type === "MemberExpression" && memberPath(current).startsWith(prefix)
          );
        if (reads("rt.")) return MESSAGES.contentContainerRuntime;
        return reads("theme.") ? MESSAGES.contentContainerTheme : null;
      };

      return {
        before() {
          sheetStyles.clear();
          wrapped.clear();
          attributes.length = 0;
          return gate(context, "contentContainerStyle");
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type !== "Identifier") return;
          if (calleeName(init) === "withUnistyles") {
            wrapped.add(id.name);
            return;
          }
          if (init?.type !== "CallExpression" || !isStyleSheetCreate(init)) return;
          const styles = stylesObjectOf(init.arguments[0]);
          if (!styles) return;
          const map = new Map<string, AstNode>();
          for (const property of styles.properties) {
            if (property.type !== "Property") continue;
            map.set(propertyName(property), property.value);
          }
          sheetStyles.set(id.name, map);
        },
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || node.name.name !== "contentContainerStyle") return;
          attributes.push(node);
        },
        "Program:exit"() {
          for (const attribute of attributes) {
            const message = complaintFor(attribute);
            if (message !== null) context.report({ node: attribute, message });
          }
        },
      };
    },
  }
);
