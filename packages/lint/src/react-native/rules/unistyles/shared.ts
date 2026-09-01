import { ancestors, calleeName, gate, isFunction, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext, Visitor } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate } from "../../stylesheet.js";

export {
  CREATE_MARKER,
  isStyleSheetCreate,
  propertyName,
  stylesObjectOf,
  type StylesObject,
} from "../../stylesheet.js";

export const memberPath = (node: AstNode | null | undefined): string => {
  const parts: string[] = [];
  let current: AstNode | null | undefined = node;
  while (current?.type === "MemberExpression") {
    const { property } = current;
    if (property.type === "Identifier") parts.unshift(property.name);
    else if (property.type === "Literal") parts.unshift(String(property.value));
    else parts.unshift("*");
    current = current.object;
  }
  if (current?.type === "Identifier") parts.unshift(current.name);
  return parts.join(".");
};

export const declaresUseUnistylesTheme = (scope: AstNode): boolean =>
  subtreeHas(scope, current => {
    if (current.type !== "VariableDeclarator") return false;
    const { id, init } = current;
    return (
      id.type === "ObjectPattern" &&
      calleeName(init) === "useUnistyles" &&
      id.properties.some(
        property => property.type === "Property" && property.key.type === "Identifier" && property.key.name === "theme"
      )
    );
  });

/**
 * The enclosing function that destructures a `useUnistyles()` theme, innermost first. Walking past the
 * innermost function matters: the read is often inside a callback the component passes down.
 */
export const themeConsumingComponent = (node: AstNode): AstNode | null => {
  for (const current of ancestors(node)) {
    if (isFunction(current) && declaresUseUnistylesTheme(current)) return current;
  }
  return null;
};

export const readsTheme = (node: AstNode): boolean =>
  subtreeHas(node, current => current.type === "MemberExpression" && memberPath(current).startsWith("theme."));

/**
 * Builds a rule whose visitors only fire inside `StyleSheet.create(...)`, by tracking how deeply
 * nested the traversal currently is in such a call. The depth resets per file in `before()`, which
 * also runs the text gate.
 */
export const inCreate = (description: string, visit: (context: RuleContext, inside: () => boolean) => Visitor): Rule =>
  problem(description, {
    createOnce(context) {
      let createDepth = 0;
      const inside = () => createDepth > 0;
      const visitors = visit(context, inside);
      const { CallExpression: enter, "CallExpression:exit": exit } = visitors;
      return {
        ...visitors,
        before() {
          createDepth = 0;
          return gate(context, CREATE_MARKER);
        },
        CallExpression(node) {
          if (isStyleSheetCreate(node)) createDepth += 1;
          enter?.(node);
        },
        "CallExpression:exit"(node) {
          exit?.(node);
          if (isStyleSheetCreate(node)) createDepth -= 1;
        },
      };
    },
  });
