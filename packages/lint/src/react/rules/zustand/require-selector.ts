import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGES = {
  zustandBare:
    "Pass a selector to this store hook, e.g. `useSettingsStore(state => state.theme)`. Use `.getState()` for an imperative read.",
  zustandUndefined:
    "Replace `undefined` with a selector such as `state => state.theme`. Use `.getState()` for an imperative read.",
};

const STORE_MODULE = /^(?:@\/stores\/|(?:\.\.?\/)+stores\/)[^"']*-store$/;
const STORE_HOOK = /^use[A-Za-z0-9_$]*Store$/;

const storeHookLocalName = (specifier: AstNode): string | null => {
  if (specifier.type !== "ImportSpecifier") return null;
  const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : "";
  const local = specifier.local.name;
  return STORE_HOOK.test(imported) || STORE_HOOK.test(local) ? local : null;
};

export const requireSelector: Rule = problem(
  "Require a selector on a store hook, rather than no arguments or `undefined` in its place.",
  {
    createOnce(context: RuleContext) {
      const hooks = new Set<string>();
      const calls: { node: AstNode; name: string; bare: boolean }[] = [];
      return {
        before() {
          hooks.clear();
          calls.length = 0;
        },
        ImportDeclaration(node) {
          if (!STORE_MODULE.test(node.source.value)) return;
          for (const specifier of node.specifiers) {
            const local = storeHookLocalName(specifier);
            if (local !== null) hooks.add(local);
          }
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "Identifier") return;
          const { name } = callee;
          if (!hooks.has(name) && !STORE_HOOK.test(name)) return;
          const args = node.arguments;
          if (args.length === 0) {
            calls.push({ node, name, bare: true });
            return;
          }
          const [first] = args;
          if (args.length === 1 && first?.type === "Identifier" && first.name === "undefined") {
            calls.push({ node, name, bare: false });
          }
        },
        "Program:exit"() {
          for (const call of calls) {
            if (!hooks.has(call.name)) continue;
            context.report({
              node: call.node,
              message: call.bare ? MESSAGES.zustandBare : MESSAGES.zustandUndefined,
            });
          }
        },
      };
    },
  }
);
