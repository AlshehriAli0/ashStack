// @ashstack/lint — Zustand conventions.

const MESSAGES = {
  zustandBare:
    "Pass a selector to the Zustand store hook, for example `useSettingsStore(state => state.theme)`. Bare store subscriptions re-render for every store change; use `.getState()` for an imperative read.",
  zustandUndefined:
    "Passing `undefined` still subscribes to the entire Zustand store. Pass a selector such as `state => state.theme`, or use `.getState()` for an imperative read.",
};

const STORE_MODULE = /^(?:@\/stores\/|(?:\.\.?\/)+stores\/)[^"']*-store$/;
const STORE_HOOK = /^use[A-Za-z0-9_$]*Store$/;

const requireSelector = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a selector when calling a Zustand store hook; calling it bare or with `undefined` subscribes to the whole store, so the component re-renders for every store change.",
    },
  },
  createOnce(context) {
    const hooks = new Set();
    const calls = [];
    return {
      before() {
        hooks.clear();
        calls.length = 0;
      },
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string" || !STORE_MODULE.test(source)) return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported?.name ?? "";
          const local = specifier.local?.name ?? "";
          if (STORE_HOOK.test(imported) || STORE_HOOK.test(local)) hooks.add(local);
        }
      },
      CallExpression(node) {
        if (node.callee?.type !== "Identifier") return;
        const name = node.callee.name;
        if (!hooks.has(name) && !STORE_HOOK.test(name)) return;
        const args = node.arguments ?? [];
        if (args.length === 0) {
          calls.push({ node, name, bare: true });
          return;
        }
        if (args.length === 1 && args[0]?.type === "Identifier" && args[0].name === "undefined") {
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
};

export default {
  meta: { name: "@ashstack/zustand" },
  rules: {
    "require-selector": requireSelector,
  },
};
