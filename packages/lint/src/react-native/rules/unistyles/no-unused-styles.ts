import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, propertyName, stylesObjectOf, type GateContext } from "./shared.js";

const EVERY_KEY = "*";

const namedStyleKeys = (styles: AstNode): Map<string, AstNode> | null => {
  const keys = new Map<string, AstNode>();
  for (const property of (styles.properties as AstNode[] | undefined) ?? []) {
    if (property.type !== "Property" || property.computed) return null;
    const name = propertyName(property);
    if (name === "") return null;
    keys.set(name, property.key as AstNode);
  }
  return keys;
};

export const noUnusedStyles: Rule = problem(
  "Report stylesheet keys that nothing in the file reads. A computed key, a computed read, or a sheet that leaves the module skips the whole file.",
  {
    createOnce(context: GateContext) {
      let declaredStyleKeys = new Map<string, Map<string, AstNode>>();
      let readStyleKeys = new Set<string>();
      let aUseCouldBeHidden = false;
      const markRead = (sheet: string, key: string): void => {
        readStyleKeys.add(`${sheet}.${key}`);
      };
      const markWholeSheetRead = (sheet: string): void => {
        markRead(sheet, EVERY_KEY);
      };
      const reportUnusedAtEndOfFile = (): void => {
        if (aUseCouldBeHidden) return;
        for (const [sheet, keys] of declaredStyleKeys) {
          if (readStyleKeys.has(`${sheet}.${EVERY_KEY}`)) continue;
          for (const [name, keyNode] of keys) {
            if (readStyleKeys.has(`${sheet}.${name}`)) continue;
            context.report({
              node: keyNode,
              message: `Delete \`${sheet}.${name}\` — nothing reads it, so it is dead weight that keeps a token alive nothing renders.`,
            });
          }
        }
      };
      return {
        before() {
          declaredStyleKeys = new Map();
          readStyleKeys = new Set();
          aUseCouldBeHidden = false;
          return gate(context, CREATE_MARKER);
        },
        CallExpression(node) {
          if (!isStyleSheetCreate(node)) return;
          const declarator = node.parent?.type === "VariableDeclarator" ? node.parent : null;
          const id = declarator?.id as AstNode | undefined;
          if (id?.type !== "Identifier") {
            aUseCouldBeHidden = true;
            return;
          }
          const styles = stylesObjectOf(((node.arguments as AstNode[] | undefined) ?? [])[0]);
          const keys = styles === null ? null : namedStyleKeys(styles);
          if (keys === null) {
            aUseCouldBeHidden = true;
            return;
          }
          declaredStyleKeys.set(id.name as string, keys);
        },
        MemberExpression(node) {
          const object = node.object as AstNode | undefined;
          const property = node.property as AstNode | undefined;
          if (object?.type !== "Identifier") return;
          if (node.computed) {
            markWholeSheetRead(object.name as string);
            return;
          }
          if (property?.type === "Identifier") markRead(object.name as string, property.name as string);
        },
        ExportNamedDeclaration(node) {
          const declaration = node.declaration as AstNode | undefined;
          for (const child of (declaration?.declarations as AstNode[] | undefined) ?? []) {
            const id = child.id as AstNode | undefined;
            if (id?.type === "Identifier") markWholeSheetRead(id.name as string);
          }
          for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
            const local = specifier.local as AstNode | undefined;
            if (local?.type === "Identifier") markWholeSheetRead(local.name as string);
          }
        },
        ExportDefaultDeclaration(node) {
          const declaration = node.declaration as AstNode | undefined;
          if (declaration?.type === "Identifier") markWholeSheetRead(declaration.name as string);
        },
        "Program:exit": reportUnusedAtEndOfFile,
      };
    },
  }
);
