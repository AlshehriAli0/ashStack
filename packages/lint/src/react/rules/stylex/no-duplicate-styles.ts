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

export const noDuplicateStyles: Rule = problem("Reuse identical static styles within one `stylex.create` call.", {
  createOnce(context) {
    const bindings = { namespaces: new Set<string>(), named: new Set<string>() };

    return {
      before() {
        bindings.namespaces.clear();
        bindings.named.clear();
        return context.sourceCode.text.includes("stylex");
      },
      Program(node) {
        collectImports(node.body, "create", bindings);
      },
      CallExpression(node) {
        if (!isStylexCall(context, node, "create", bindings)) return;
        const [styles] = node.arguments;
        if (styles?.type !== "ObjectExpression") return;

        const seen = new Map<string, string>();
        for (const style of styles.properties) {
          if (style.type !== "Property") continue;
          const key = propertyKeyName(style);
          if (!key) continue;
          const value = signature(style.value);
          if (value === null) continue;
          const original = seen.get(value);
          if (original)
            context.report({
              node: style,
              message: `\`${key}\` duplicates \`${original}\`. Reuse \`${original}\`.`,
            });
          else seen.set(value, key);
        }
      },
    };
  },
});
