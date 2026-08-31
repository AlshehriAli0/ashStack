import { calleeName, findInSubtree, gate, problem, subtreeHas, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, memberPath, propertyName, stylesObjectOf, type GateContext } from "./shared.js";

const MESSAGES = {
  contentContainerRuntime:
    "Wrap this component with `withUnistyles`, or pass `contentContainerStyle` a plain hook-fed style. On a raw component `contentContainerStyle` never subscribes to Unistyles updates.",
  contentContainerTheme:
    "Wrap this component with `withUnistyles`, or pass `contentContainerStyle` a plain hook-fed style. On a raw component `contentContainerStyle` never subscribes to theme changes.",
};

export const contentContainer: Rule = problem(
  "A raw component never subscribes its `contentContainerStyle` to theme or `rt` updates. Wrap the component with `withUnistyles` when the style depends on either.",
  {
    createOnce(context: GateContext) {
      const sheetStyles = new Map<string, Map<string, AstNode>>();
      const wrapped = new Set<string>();
      const attributes: AstNode[] = [];
      return {
        before() {
          sheetStyles.clear();
          wrapped.clear();
          attributes.length = 0;
          return gate(context, "contentContainerStyle");
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type !== "Identifier") return;
          if (calleeName(init) === "withUnistyles") {
            wrapped.add(id.name as string);
            return;
          }
          if (!isStyleSheetCreate(init)) return;
          const styles = stylesObjectOf(((init?.arguments as AstNode[] | undefined) ?? [])[0]);
          if (!styles) return;
          const map = new Map<string, AstNode>();
          for (const property of (styles.properties as AstNode[] | undefined) ?? []) {
            if (property.type !== "Property") continue;
            map.set(propertyName(property), property.value as AstNode);
          }
          sheetStyles.set(id.name as string, map);
        },
        JSXAttribute(node) {
          if ((node.name as AstNode | undefined)?.name !== "contentContainerStyle") return;
          attributes.push(node);
        },
        "Program:exit"() {
          for (const attribute of attributes) {
            const reference = findInSubtree(attribute.value, current => {
              const object = current.object as AstNode | undefined;
              return (
                current.type === "MemberExpression" &&
                object?.type === "Identifier" &&
                sheetStyles.has(object.name as string)
              );
            });
            if (!reference) continue;
            const owner = attribute.parent;
            if (owner?.type === "JSXOpeningElement" && wrapped.has(tagIdentifier(owner.name as AstNode))) continue;
            const property = reference.property as AstNode | undefined;
            const definition = sheetStyles
              .get((reference.object as AstNode).name as string)
              ?.get(property?.type === "Identifier" ? (property.name as string) : "");
            if (!definition) continue;
            const usesRuntime = subtreeHas(
              definition,
              current => current.type === "MemberExpression" && memberPath(current).startsWith("rt.")
            );
            if (usesRuntime) {
              context.report({ node: attribute, message: MESSAGES.contentContainerRuntime });
              continue;
            }
            const usesTheme = subtreeHas(
              definition,
              current => current.type === "MemberExpression" && memberPath(current).startsWith("theme.")
            );
            if (usesTheme) context.report({ node: attribute, message: MESSAGES.contentContainerTheme });
          }
        },
      };
    },
  }
);
