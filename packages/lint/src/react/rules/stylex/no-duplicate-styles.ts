import { problem, propertyKeyName } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { collectImports, isStylexCall } from "./imports.js";

const LOCATION_KEYS = new Set(["parent", "loc", "range", "start", "end", "raw"]);
const stableValue = (name: string, value: unknown): unknown => {
  if (LOCATION_KEYS.has(name)) return undefined;
  return typeof value === "bigint" ? { bigint: value.toString() } : value;
};

/** Compare complete static declarations; preserve order inside conditional values. */
const signature = (node: AstNode): string | null => {
  if (node.type !== "ObjectExpression") return null;
  const declarations: [string, string][] = [];
  for (const property of node.properties) {
    if (property.type !== "Property") return null;
    const key = propertyKeyName(property);
    if (!key) return null;
    declarations.push([key, JSON.stringify(property.value, stableValue)]);
  }
  return JSON.stringify(declarations.sort(([a], [b]) => a.localeCompare(b)));
};

type Duplicate = { node: AstNode; owner: string; key: string; original: string };

const collectDuplicates = (styles: AstNode, owner: string, duplicates: Duplicate[]): void => {
  if (styles.type !== "ObjectExpression") return;
  const seen = new Map<string, string>();
  for (const style of styles.properties) {
    if (style.type !== "Property") continue;
    const key = propertyKeyName(style);
    if (!key) continue;
    const value = signature(style.value);
    if (value === null) continue;
    const original = seen.get(value);
    if (original) duplicates.push({ node: style.value, owner, key, original });
    else seen.set(value, key);
  }
};

export const noDuplicateStyles: Rule = problem("Reuse identical static styles within one `stylex.create` call.", {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };
    const used = new Set<string>();
    const duplicates: Duplicate[] = [];

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        used.clear();
        duplicates.length = 0;
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "create", bindings);
      },
      MemberExpression(node) {
        if (node.object.type !== "Identifier") return;
        if (node.computed && node.property.type !== "Literal") used.add(`${node.object.name}.*`);
        if (node.property.type === "Identifier" && !node.computed)
          used.add(`${node.object.name}.${node.property.name}`);
        if (node.property.type === "Literal" && typeof node.property.value === "string")
          used.add(`${node.object.name}.${node.property.value}`);
      },
      CallExpression(node) {
        if (!isStylexCall(context, node, "create", bindings)) return;
        if (node.parent.type !== "VariableDeclarator" || node.parent.id.type !== "Identifier") return;
        if (
          node.parent.parent.type === "VariableDeclaration" &&
          node.parent.parent.parent.type === "ExportNamedDeclaration"
        )
          return;
        const [styles] = node.arguments;
        if (styles) collectDuplicates(styles, node.parent.id.name, duplicates);
      },
      "Program:exit"() {
        for (const { node, owner, key, original } of duplicates) {
          if (used.has(`${owner}.*`) || (used.has(`${owner}.${key}`) && used.has(`${owner}.${original}`))) continue;
          context.report({ node, message: `\`${key}\` duplicates \`${original}\`. Reuse \`${original}\`.` });
        }
      },
    };
  },
});
