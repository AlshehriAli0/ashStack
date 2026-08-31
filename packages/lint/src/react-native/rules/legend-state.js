// @ashstack/lint — Legend State v3 conventions.
//
// The rule that matters most is no-assignment: writing to an observable with `=`
// is a silent no-op. The code looks right, the linter used to say nothing, and
// the value never changes.
//
// Gates fail OPEN — if the source text is unavailable the rule still runs.

const OBSERVABLE_FACTORIES = new Set(["observable", "useObservable"]);
const OBS = /\$$/;

// Callbacks passed to these run inside a tracking context, so a `get()` there
// subscribes and a `peek()` there deliberately does not.
const TRACKING_CALLEES = new Set(["useValue", "observe", "useObserve", "useObserveEffect", "when", "whenReady"]);

const COMPONENT_OR_HOOK = /^(?:[A-Z]|use[A-Z])/;

const isFunction = node => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return text == null || markers.some(marker => text.includes(marker));
};

// `count$` or `settings$.theme.color` — anything rooted at a $-suffixed name.
const rootName = node => {
  let current = node;
  while (current?.type === "MemberExpression") current = current.object;
  return current?.type === "Identifier" ? current.name : null;
};

const isObservableRef = node => {
  const root = rootName(node);
  return root != null && OBS.test(root);
};

const factoryCalled = node =>
  node?.type === "CallExpression" && node.callee?.type === "Identifier" && OBSERVABLE_FACTORIES.has(node.callee.name)
    ? node.callee.name
    : null;

const noAssignment = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "$");
      },
      AssignmentExpression(node) {
        if (!isObservableRef(node.left)) return;
        const target = context.sourceCode?.getText?.(node.left) ?? "the observable";
        context.report({
          node,
          message: `Assigning to an observable is a silent no-op — the value will not change. Use \`${target}.set(...)\`, or \`.assign({...})\` to merge several fields.`,
        });
      },
      UpdateExpression(node) {
        if (!isObservableRef(node.argument)) return;
        const target = context.sourceCode?.getText?.(node.argument) ?? "the observable";
        context.report({
          node,
          message: `\`${node.operator}\` on an observable is a silent no-op. Use \`${target}.set(v => v ${node.operator[0]} 1)\`.`,
        });
      },
    };
  },
};

const naming = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "observable(", "useObservable(");
      },
      VariableDeclarator(node) {
        const factory = factoryCalled(node.init);
        if (!factory || node.id?.type !== "Identifier") return;
        if (OBS.test(node.id.name)) return;
        context.report({
          node: node.id,
          message: `Name this \`${node.id.name}$\`. The trailing \`$\` is how a reader tells an observable from a plain value, and every rule about observables keys off it.`,
        });
      },
    };
  },
};

const noNestedObservable = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "observable(", "useObservable(");
      },
      CallExpression(node) {
        const factory = factoryCalled(node);
        if (!factory) return;
        const argument = node.arguments?.[0];
        if (!argument || !isObservableRef(argument)) return;
        context.report({
          node: argument,
          message: `Do not pass an observable to \`${factory}()\`. Reuse the existing reference — wrapping it creates a second node whose reads and writes do not reach the original.`,
        });
      },
    };
  },
};

const noReactMirror = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "useState");
      },
      CallExpression(node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "useState") return;
        const argument = node.arguments?.[0];
        if (argument?.type !== "CallExpression") return;
        const callee = argument.callee;
        if (callee?.type !== "MemberExpression") return;
        const method = callee.property?.name;
        if (method !== "get" && method !== "peek") return;
        if (!isObservableRef(callee.object)) return;
        context.report({
          node,
          message:
            "Do not seed React state from an observable. There must be one owner: read it with `useValue(...)` where it renders, and keep the observable as the only source of truth.",
        });
      },
    };
  },
};

// A read in JSX is only tracked when it sits inside a function the reactive
// components call — `<Memo>{() => count$.get()}</Memo>`. Directly in the
// container it is a plain read, so the value renders once and never updates.
const noUntrackedGetInJsx = {
  meta: { type: "problem" },
  createOnce(context) {
    let fnDepth = 0;
    let containers = [];
    const enter = () => {
      fnDepth++;
    };
    const exit = () => {
      fnDepth--;
    };

    return {
      before() {
        fnDepth = 0;
        containers = [];
        return gate(context, ".get()");
      },
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,

      JSXExpressionContainer() {
        containers.push(fnDepth);
      },
      "JSXExpressionContainer:exit"() {
        containers.pop();
      },

      CallExpression(node) {
        if (containers.length === 0) return;
        if (fnDepth !== containers[containers.length - 1]) return;

        const callee = node.callee;
        if (callee?.type !== "MemberExpression" || callee.property?.name !== "get") return;
        if (!isObservableRef(callee.object)) return;

        const target = context.sourceCode?.getText?.(callee.object) ?? "the observable";
        context.report({
          node,
          message: `A \`get()\` here is a plain read, not a subscription — this renders the first value and never updates. Read it with \`useValue(${target})\` at the top of the component, or wrap the fragment in \`<Memo>\` so the read happens inside a tracking context.`,
        });
      },
    };
  },
};

// The mirror of the rule above: inside a selector, peek() is the one read
// that does not subscribe, so the component never re-renders for it.
const noPeekInSelector = {
  meta: { type: "problem" },
  createOnce(context) {
    let selectors = new WeakSet();
    let depth = 0;

    return {
      before() {
        selectors = new WeakSet();
        depth = 0;
        return gate(context, ".peek()");
      },
      CallExpression(node) {
        if (node.callee?.type === "Identifier" && TRACKING_CALLEES.has(node.callee.name)) {
          const argument = node.arguments?.[0];
          if (isFunction(argument)) selectors.add(argument);
        }

        if (depth === 0) return;
        const callee = node.callee;
        if (callee?.type !== "MemberExpression" || callee.property?.name !== "peek") return;
        if (!isObservableRef(callee.object)) return;

        const target = context.sourceCode?.getText?.(callee.object) ?? "the observable";
        context.report({
          node,
          message: `\`peek()\` never subscribes, so this selector will not re-run when the value changes and the component keeps rendering the first one. Use \`${target}.get()\` here, and keep \`peek()\` for handlers and async work.`,
        });
      },
      ArrowFunctionExpression(node) {
        if (selectors.has(node)) depth++;
      },
      "ArrowFunctionExpression:exit"(node) {
        if (selectors.has(node)) depth--;
      },
      FunctionExpression(node) {
        if (selectors.has(node)) depth++;
      },
      "FunctionExpression:exit"(node) {
        if (selectors.has(node)) depth--;
      },
    };
  },
};

const noObjectSelector = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "useValue");
      },
      CallExpression(node) {
        if (node.callee?.name !== "useValue") return;

        const argument = node.arguments?.[0];
        if (!isFunction(argument)) return;

        const kind =
          argument.body?.type === "ObjectExpression"
            ? "object"
            : argument.body?.type === "ArrayExpression"
              ? "array"
              : null;
        if (kind == null) return;

        context.report({
          node: argument.body,
          message: `This selector returns a new ${kind} every time it runs, so its identity always differs and the component re-renders on every store change. Return the primitive that decides the render, or call \`useValue\` once per field.`,
        });
      },
    };
  },
};

const noObservableInComponent = {
  meta: { type: "problem" },
  createOnce(context) {
    let componentDepth = 0;
    const enter = name => {
      if (typeof name === "string" && COMPONENT_OR_HOOK.test(name)) componentDepth++;
    };
    const exit = name => {
      if (typeof name === "string" && COMPONENT_OR_HOOK.test(name)) componentDepth--;
    };

    return {
      before() {
        componentDepth = 0;
        return gate(context, "observable(");
      },
      FunctionDeclaration(node) {
        enter(node.id?.name);
      },
      "FunctionDeclaration:exit"(node) {
        exit(node.id?.name);
      },
      VariableDeclarator(node) {
        if (isFunction(node.init)) enter(node.id?.name);
      },
      "VariableDeclarator:exit"(node) {
        if (isFunction(node.init)) exit(node.id?.name);
      },

      CallExpression(node) {
        if (componentDepth === 0) return;
        if (node.callee?.type !== "Identifier" || node.callee.name !== "observable") return;

        context.report({
          node,
          message:
            "`observable()` here creates a new observable on every render, so nothing that read the previous one is listening to this one. Use `useObservable()` for component-lifetime state, or move the observable to a store in src/stores and import it.",
        });
      },
    };
  },
};

export default {
  meta: { name: "legend-state" },
  rules: {
    "no-assignment": noAssignment,
    naming: naming,
    "no-nested-observable": noNestedObservable,
    "no-react-mirror": noReactMirror,
    "no-untracked-get-in-jsx": noUntrackedGetInJsx,
    "no-peek-in-selector": noPeekInSelector,
    "no-object-selector": noObjectSelector,
    "no-observable-in-component": noObservableInComponent,
  },
};
