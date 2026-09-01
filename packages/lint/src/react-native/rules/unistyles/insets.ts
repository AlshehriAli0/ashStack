import { calleeName, closestAncestor, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { isStyleSheetCreate, type GateContext } from "./shared.js";

const INSET_TEXT = /(?:inset|safearea|top|bottom|left|right)/i;

const MESSAGES = {
  insetsStyleCall:
    "Read safe-area values from `rt.insets` inside `StyleSheet.create` instead of passing `useSafeAreaInsets()` into a style function.",
  insetsAttribute:
    "Resolve these safe-area values through `rt.insets` in `StyleSheet.create` instead of a hook-fed inline JSX style object.",
};

interface SourceCode {
  getText(node: AstNode): string;
}

type InsetsContext = GateContext & {
  sourceCode?: SourceCode;
  getSourceCode(): SourceCode;
};

const boundNames = (id: AstNode | undefined): string[] => {
  if (id?.type === "Identifier") return [id.name as string];
  if (id?.type !== "ObjectPattern") return [];
  const names: string[] = [];
  for (const property of (id.properties as AstNode[] | undefined) ?? []) {
    const value = property.value as AstNode | undefined;
    const key = property.key as AstNode | undefined;
    if (value?.type === "Identifier") names.push(value.name as string);
    else if (key?.type === "Identifier") names.push(key.name as string);
  }
  return names;
};

export const insets: Rule = problem(
  "Disallow passing `useSafeAreaInsets()` values into a dynamic style function or an inline JSX style object. Read `rt.insets` inside `StyleSheet.create` instead.",
  {
    createOnce(context: InsetsContext) {
      const insetBindings = new Set<string>();
      const sheets = new Set<string>();
      const styleCalls: { node: AstNode; receiver: string }[] = [];
      const styleAttributes: AstNode[] = [];
      const source = (): SourceCode => context.sourceCode ?? context.getSourceCode();
      return {
        before() {
          insetBindings.clear();
          sheets.clear();
          styleCalls.length = 0;
          styleAttributes.length = 0;
          return gate(context, "useSafeAreaInsets");
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type === "Identifier" && isStyleSheetCreate(init)) {
            sheets.add(id.name as string);
            return;
          }
          if (calleeName(init) !== "useSafeAreaInsets") return;
          for (const name of boundNames(id)) insetBindings.add(name);
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "MemberExpression") return;
          const receiver = callee.object as AstNode | undefined;
          if (receiver?.type !== "Identifier") return;
          const exempt = closestAncestor(node, new Set(["JSXAttribute"]));
          if ((exempt?.name as AstNode | undefined)?.name === "contentContainerStyle") return;
          styleCalls.push({ node, receiver: receiver.name as string });
        },
        JSXAttribute(node) {
          if ((node.name as AstNode | undefined)?.name !== "style") return;
          styleAttributes.push(node);
        },
        "Program:exit"() {
          const referencesBinding = (node: AstNode): boolean =>
            subtreeHas(node, current => current.type === "Identifier" && insetBindings.has(current.name as string));
          for (const entry of styleCalls) {
            if (!sheets.has(entry.receiver)) continue;
            const text = source().getText(entry.node);
            if (!INSET_TEXT.test(text)) continue;
            if (!referencesBinding(entry.node)) continue;
            context.report({ node: entry.node, message: MESSAGES.insetsStyleCall });
          }
          for (const attribute of styleAttributes) {
            const text = source().getText(attribute);
            if (!INSET_TEXT.test(text)) continue;
            const usesInsetsMember = subtreeHas(attribute, current => {
              const object = current.object as AstNode | undefined;
              return (
                current.type === "MemberExpression" &&
                object?.type === "Identifier" &&
                insetBindings.has(object.name as string)
              );
            });
            if (!usesInsetsMember) continue;
            context.report({ node: attribute, message: MESSAGES.insetsAttribute });
          }
        },
      };
    },
  }
);
