// Cross-traversal state: collect every sheet's keys and every `sheet.key` read,
// then report at the end. Anything that could hide a use — a computed key, a
// computed read, or the sheet escaping the module — bails the whole file.
import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, propertyName, stylesObjectOf, type GateContext } from "./shared.js";

export const noUnusedStyles: Rule = problem(
  "Report stylesheet keys that nothing in the file reads. A computed key, a computed read, or a sheet that leaves the module skips the whole file.",
  {
    createOnce(context: GateContext) {
      let sheets = new Map<string, Map<string, AstNode>>();
      let reads = new Set<string>();
      let bail = false;
      return {
        before() {
          sheets = new Map();
          reads = new Set();
          bail = false;
          return gate(context, CREATE_MARKER);
        },
        CallExpression(node) {
          if (!isStyleSheetCreate(node)) return;
          const declarator = node.parent?.type === "VariableDeclarator" ? node.parent : null;
          const id = declarator?.id as AstNode | undefined;
          if (id?.type !== "Identifier") {
            bail = true;
            return;
          }
          const styles = stylesObjectOf(((node.arguments as AstNode[] | undefined) ?? [])[0]);
          if (!styles) {
            bail = true;
            return;
          }
          const keys = new Map<string, AstNode>();
          for (const property of (styles.properties as AstNode[] | undefined) ?? []) {
            if (property.type !== "Property" || property.computed) {
              bail = true;
              continue;
            }
            const name = propertyName(property);
            if (name === "") bail = true;
            else keys.set(name, property.key as AstNode);
          }
          sheets.set(id.name as string, keys);
        },
        MemberExpression(node) {
          const object = node.object as AstNode | undefined;
          const property = node.property as AstNode | undefined;
          if (object?.type !== "Identifier") return;
          if (node.computed) {
            reads.add(`${object.name as string}.*`);
            return;
          }
          if (property?.type === "Identifier") reads.add(`${object.name as string}.${property.name as string}`);
        },
        // A stylesheet reaching another module cannot be checked from here.
        ExportNamedDeclaration(node) {
          const declaration = node.declaration as AstNode | undefined;
          for (const child of (declaration?.declarations as AstNode[] | undefined) ?? []) {
            const id = child.id as AstNode | undefined;
            if (id?.type === "Identifier") reads.add(`${id.name as string}.*`);
          }
          for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
            const local = specifier.local as AstNode | undefined;
            if (local?.type === "Identifier") reads.add(`${local.name as string}.*`);
          }
        },
        ExportDefaultDeclaration(node) {
          const declaration = node.declaration as AstNode | undefined;
          if (declaration?.type === "Identifier") reads.add(`${declaration.name as string}.*`);
        },
        "Program:exit"() {
          if (bail) return;
          for (const [sheet, keys] of sheets) {
            if (reads.has(`${sheet}.*`)) continue;
            for (const [name, keyNode] of keys) {
              if (reads.has(`${sheet}.${name}`)) continue;
              context.report({
                node: keyNode,
                message: `Delete \`${sheet}.${name}\` — nothing reads it, so it is dead weight that keeps a token alive nothing renders.`,
              });
            }
          }
        },
      };
    },
  }
);
