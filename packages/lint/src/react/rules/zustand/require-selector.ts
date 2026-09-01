import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MESSAGES = {
  zustandBare:
    "Pass a selector to this store hook, for example `useSettingsStore(state => state.theme)`, so it re-renders only on that slice. Use `.getState()` instead for an imperative read.",
  zustandUndefined:
    "Replace `undefined` with a selector such as `state => state.theme` — it still subscribes to the whole store otherwise. Use `.getState()` instead for an imperative read.",
};

const STORE_MODULE = /^(?:@\/stores\/|(?:\.\.?\/)+stores\/)[^"']*-store$/;
const STORE_HOOK = /^use[A-Za-z0-9_$]*Store$/;

const importSource = (node: AstNode): string | null => {
  const value = (node.source as AstNode | undefined)?.value;
  return typeof value === "string" ? value : null;
};

const storeHookLocalName = (specifier: AstNode): string | null => {
  if (specifier.type !== "ImportSpecifier") return null;
  const imported = ((specifier.imported as AstNode | undefined)?.name as string | undefined) ?? "";
  const local = ((specifier.local as AstNode | undefined)?.name as string | undefined) ?? "";
  return STORE_HOOK.test(imported) || STORE_HOOK.test(local) ? local : null;
};

export const requireSelector: Rule = problem(
  "Reports a store hook called with no arguments, or with `undefined` where the selector belongs.",
  {
    createOnce(context: RuleContext) {
      const hooks = new Set<string>();
      const calls: { node: AstNode; name: string; bare: boolean }[] = [];
      return {
        before() {
          hooks.clear();
          calls.length = 0;
        },
        ImportDeclaration(node: AstNode) {
          const source = importSource(node);
          if (source === null || !STORE_MODULE.test(source)) return;
          for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
            const local = storeHookLocalName(specifier);
            if (local !== null) hooks.add(local);
          }
        },
        CallExpression(node: AstNode) {
          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "Identifier") return;
          const name = callee.name as string;
          if (!hooks.has(name) && !STORE_HOOK.test(name)) return;
          const args = (node.arguments as AstNode[] | undefined) ?? [];
          if (args.length === 0) {
            calls.push({ node, name, bare: true });
            return;
          }
          const first = args[0] as AstNode | undefined;
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
