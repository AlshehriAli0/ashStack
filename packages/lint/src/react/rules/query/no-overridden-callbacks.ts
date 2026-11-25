import { gate, problem, propertyKeyName } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { MUTATION_OPTIONS_CALLS, optionsArgument, QUERY_OPTIONS_CALLS } from "./shared.js";

const CALLBACKS = new Set(["onSuccess", "onError", "onSettled"]);
const GUARDED = new Set([...CALLBACKS, "mutationFn", "queryFn", "queryKey"]);

/** The keys a spread of `rest` cannot carry, because `const { onSuccess, ...rest } = config` took them out. */
const keysTakenOut = (context: RuleContext, spread: AstNode): Set<string> => {
  if (spread.type !== "SpreadElement" || spread.argument.type !== "Identifier") return new Set();
  const { argument } = spread;
  const reference = context.sourceCode.getScope(spread).references.find(ref => ref.identifier === argument);
  const binding = reference?.resolved?.defs[0]?.name.parent;
  const pattern = binding?.type === "RestElement" ? binding.parent : null;
  if (pattern?.type !== "ObjectPattern") return new Set();
  return new Set(pattern.properties.map(propertyKeyName));
};

const messageFor = (keys: string[]): string => {
  const listed = keys.map(key => `\`${key}\``).join(", ");
  const callback = keys.find(key => CALLBACKS.has(key));
  const keepBoth =
    callback === undefined
      ? ""
      : ` To keep the caller's \`${callback}\` too, destructure it out (\`const { ${callback}, ...rest } = config\`) and call it from yours.`;
  return `Move this spread above ${listed}: a later spread replaces every key it shares, so the value written here is silently dropped.${keepBoth}`;
};

export const noOverriddenCallbacks: Rule = problem(
  "Disallow a spread after `onSuccess`, `onError`, `onSettled`, `mutationFn`, `queryFn` or `queryKey` in a query or mutation options object. Whatever the spread carries under those keys replaces the ones written before it.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "...");
        },
        CallExpression(node) {
          const options = optionsArgument(node, QUERY_OPTIONS_CALLS) ?? optionsArgument(node, MUTATION_OPTIONS_CALLS);
          if (options?.type !== "ObjectExpression") return;
          const written: string[] = [];
          for (const property of options.properties) {
            if (property.type === "Property") {
              const name = propertyKeyName(property);
              if (GUARDED.has(name)) written.push(name);
              continue;
            }
            const takenOut = keysTakenOut(context, property);
            const replaced = written.filter(name => !takenOut.has(name));
            if (replaced.length > 0) context.report({ node: property, message: messageFor(replaced) });
          }
        },
      };
    },
  }
);
