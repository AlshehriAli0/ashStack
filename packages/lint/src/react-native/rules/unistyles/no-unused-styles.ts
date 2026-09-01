import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, propertyName, stylesObjectOf, type StylesObject } from "./shared.js";

const EVERY_KEY = "*";

const namedStyleKeys = (styles: StylesObject): Map<string, AstNode> | null => {
  const keys = new Map<string, AstNode>();
  for (const property of styles.properties) {
    if (property.type !== "Property" || property.computed) return null;
    const name = propertyName(property);
    if (name === "") return null;
    keys.set(name, property.key);
  }
  return keys;
};

export const noUnusedStyles: Rule = problem(
  "Report stylesheet keys that nothing in the file reads. A computed key, a computed read, or a sheet that leaves the module skips the whole file.",
  {
    createOnce(context) {
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
          const declarator = node.parent.type === "VariableDeclarator" ? node.parent : null;
          const id = declarator?.id;
          if (id?.type !== "Identifier") {
            aUseCouldBeHidden = true;
            return;
          }
          const styles = stylesObjectOf(node.arguments[0]);
          const keys = styles === null ? null : namedStyleKeys(styles);
          if (keys === null) {
            aUseCouldBeHidden = true;
            return;
          }
          declaredStyleKeys.set(id.name, keys);
        },
        MemberExpression(node) {
          const { object, property } = node;
          if (object.type !== "Identifier") return;
          if (node.computed) {
            markWholeSheetRead(object.name);
            return;
          }
          if (property.type === "Identifier") markRead(object.name, property.name);
        },
        ExportNamedDeclaration(node) {
          const { declaration } = node;
          if (declaration?.type === "VariableDeclaration") {
            for (const child of declaration.declarations) {
              if (child.id.type === "Identifier") markWholeSheetRead(child.id.name);
            }
          }
          for (const specifier of node.specifiers) {
            if (specifier.local.type === "Identifier") markWholeSheetRead(specifier.local.name);
          }
        },
        ExportDefaultDeclaration(node) {
          const { declaration } = node;
          if (declaration.type === "Identifier") markWholeSheetRead(declaration.name);
        },
        "Program:exit": reportUnusedAtEndOfFile,
      };
    },
  }
);
