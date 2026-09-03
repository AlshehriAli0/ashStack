import { calleeName, closestAncestor, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate } from "./shared.js";

const INSET_TEXT = /(?:inset|safearea|top|bottom|left|right)/i;

const MESSAGES = {
  insetsStyleCall:
    "Read safe-area values from `rt.insets` inside `StyleSheet.create` instead of passing `useSafeAreaInsets()` into a style function.",
  insetsAttribute:
    "Resolve these safe-area values through `rt.insets` in `StyleSheet.create` instead of a hook-fed inline style object.",
};

const boundNames = (id: AstNode): string[] => {
  if (id.type === "Identifier") return [id.name];
  if (id.type === "AssignmentPattern") return boundNames(id.left);
  if (id.type === "RestElement") return boundNames(id.argument);
  if (id.type === "ArrayPattern") return id.elements.flatMap(element => (element ? boundNames(element) : []));
  if (id.type !== "ObjectPattern") return [];
  return id.properties.flatMap(property =>
    property.type === "Property" ? boundNames(property.value) : boundNames(property.argument)
  );
};

export const insets: Rule = problem(
  "Disallow passing `useSafeAreaInsets()` values into a dynamic style function or an inline JSX style object. Read `rt.insets` inside `StyleSheet.create` instead.",
  {
    createOnce(context) {
      const insetBindings = new Set<string>();
      const sheets = new Set<string>();
      const styleCalls: { node: AstNode; receiver: string }[] = [];
      const styleAttributes: AstNode[] = [];
      return {
        before() {
          insetBindings.clear();
          sheets.clear();
          styleCalls.length = 0;
          styleAttributes.length = 0;
          return gate(context, "useSafeAreaInsets");
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type === "Identifier" && isStyleSheetCreate(init)) {
            sheets.add(id.name);
            return;
          }
          if (calleeName(init) !== "useSafeAreaInsets") return;
          for (const name of boundNames(id)) insetBindings.add(name);
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "MemberExpression") return;
          const receiver = callee.object;
          if (receiver.type !== "Identifier") return;
          const exempt = closestAncestor(node, new Set(["JSXAttribute"]));
          if (
            exempt?.type === "JSXAttribute" &&
            exempt.name.type === "JSXIdentifier" &&
            exempt.name.name === "contentContainerStyle"
          ) {
            return;
          }
          styleCalls.push({ node, receiver: receiver.name });
        },
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;
          styleAttributes.push(node);
        },
        "Program:exit"() {
          const referencesBinding = (node: AstNode): boolean =>
            subtreeHas(node, current => current.type === "Identifier" && insetBindings.has(current.name));
          for (const entry of styleCalls) {
            if (!sheets.has(entry.receiver)) continue;
            const text = context.sourceCode.getText(entry.node);
            if (!INSET_TEXT.test(text)) continue;
            if (!referencesBinding(entry.node)) continue;
            context.report({ node: entry.node, message: MESSAGES.insetsStyleCall });
          }
          for (const attribute of styleAttributes) {
            const text = context.sourceCode.getText(attribute);
            if (!INSET_TEXT.test(text)) continue;
            const usesInsetsMember = subtreeHas(
              attribute,
              current =>
                current.type === "MemberExpression" &&
                current.object.type === "Identifier" &&
                insetBindings.has(current.object.name)
            );
            if (!usesInsetsMember) continue;
            context.report({ node: attribute, message: MESSAGES.insetsAttribute });
          }
        },
      };
    },
  }
);
