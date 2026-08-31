// @ashstack/lint — React Native / Reanimated / Skia / image rules.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.

import {
  attributeName,
  calleeName,
  closestAncestor,
  crossesFunctionBefore,
  enclosingCall,
  hasAncestor,
  importedSpecifiers,
  isMemberCall,
  isWithin,
  receiverName,
  subtreeHas,
  tagIdentifier,
} from "./internal/ast.js";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return typeof text !== "string" || markers.some(marker => text.includes(marker));
};

const PRODUCERS = new Set([
  "useSharedValue",
  "useDerivedValue",
  "useScrollOffset",
  "useScrollViewOffset",
  "makeMutable",
]);

const COMPOUND_OPERATORS = new Map([
  ["+=", "+"],
  ["-=", "-"],
  ["*=", "*"],
  ["/=", "/"],
]);

const UPDATER_HOOKS = new Set(["useAnimatedStyle", "useAnimatedProps"]);
const REACTION_HOOKS = new Set(["useAnimatedReaction"]);
const CONTINUOUS_HOOKS = new Set([
  "useAnimatedReaction",
  "useFrameCallback",
  "useDerivedValue",
  "useAnimatedStyle",
  "useAnimatedProps",
  "useAnimatedScrollHandler",
]);

const LAYOUT_BUILDER_METHODS = new Set([
  "duration",
  "delay",
  "springify",
  "damping",
  "stiffness",
  "mass",
  "easing",
  "withCallback",
  "withInitialValues",
  "withTargetValues",
]);

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "copyWithin",
  "fill",
  "set",
  "add",
  "delete",
  "clear",
]);

const LAYOUT_ATTRIBUTES = new Set(["entering", "exiting", "layout"]);
const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);
const JSX_HOSTS = new Set(["JSXExpressionContainer", "JSXAttribute"]);
const PATH_HOOKS = new Set(["usePathValue", "usePathInterpolation"]);

const MESSAGES = {
  read: "read of a shared value's `.value`. Use `.get()` so React Compiler can track the read.",
  write: "write to a shared value's `.value`. Use `.set(...)` so React Compiler can track the mutation.",
  compound:
    "compound write to a shared value's `.value`. Use `.set((v) => ...)` / `.set(.get() ...)` so React Compiler can track it.",
  renderRead:
    "Do not call a zero-argument `.get()` while JSX is evaluated. Derive an animated style/prop or mirror non-visual state through an explicit callback.",
  renderWrite: "Do not mutate state while JSX is evaluated. Render must stay pure.",
  destructure:
    "Do not destructure a shared value; destructuring detaches the value from Reanimated reactivity. Keep the SharedValue object and use get()/set().",
  nestedProperty:
    "Mutating a property returned by get() bypasses shared-value reactivity. Assign a new value with set(), or use modify() for a large object.",
  nestedCollection:
    "Mutating the collection returned by get() bypasses shared-value reactivity. Assign a new collection with set(), or mutate inside modify().",
  updaterSideEffect:
    "Do not schedule RN side effects from useAnimatedStyle/useAnimatedProps. Use an animation completion callback or useAnimatedReaction.",
  hotBridgeUnguarded:
    "Guard scheduleOnRN by comparing the current and previous prepared results; otherwise high-frequency inputs can bridge to RN every frame.",
  hotBridgeNoPrevious:
    "Read the previous prepared result and guard scheduleOnRN by comparing current and previous; otherwise high-frequency inputs can bridge to RN every frame.",
  inlineCallback:
    "Pass a function declared in RN Runtime scope to scheduleOnRN. An inline callback has ambiguous runtime ownership and can be created on the wrong runtime.",
  layoutBuilder:
    "Construct static Reanimated layout builders at module scope, or memoize builders that depend on component values.",
  eagerInitializer:
    "Wrap computed shared-value initialization in a lazy function: useSharedValue(() => compute()). The eager call runs on every React render.",
  canvasMode:
    "Declare the Skia Canvas composition path explicitly. Use `opaque={Platform.OS === 'android'}` for an opaque/fullscreen animated canvas, or `opaque={false}` when transparency, view transforms, or ordinary stacking are required.",
  pathHooks:
    "Skia's legacy path-value hooks can self-dirty Reanimated mappers and re-record idle canvases. Own a stable SkPath buffer and mutate it from useDerivedValue instead; ensure consumers also read the driving shared value.",
  continuousWorkletState:
    "A continuously evaluated worklet schedules a React state update, which can put a Fabric commit or Skia re-recording on an animation frame. Keep the gate in shared/native state or apply it through an imperative ref.",
};

const collectFunctions = (node, report) => {
  subtreeHas(node, current => {
    if (FUNCTION_TYPES.has(current.type) && current.type !== "FunctionDeclaration") report(current);
    return false;
  });
};

const isProducerCall = node =>
  node?.type === "CallExpression" && node.callee?.type === "Identifier" && PRODUCERS.has(node.callee.name);

const isDotValue = node =>
  node?.type === "MemberExpression" &&
  node.optional !== true &&
  node.computed !== true &&
  node.object?.type === "Identifier" &&
  node.property?.type === "Identifier" &&
  node.property.name === "value";

const noSharedValueDotValue = {
  meta: { type: "problem", hasSuggestions: true },
  createOnce(context) {
    const names = new Set();
    const candidates = [];
    return {
      before() {
        names.clear();
        candidates.length = 0;
      },
      VariableDeclarator(node) {
        if (node.id?.type === "Identifier" && isProducerCall(node.init)) names.add(node.id.name);
      },
      AssignmentExpression(node) {
        if (!isDotValue(node.left)) return;
        const operator = COMPOUND_OPERATORS.get(node.operator);
        if (!operator && node.operator !== "=") return;
        candidates.push({ node, kind: operator ? "compound" : "write", operator, name: node.left.object.name });
      },
      MemberExpression(node) {
        if (!isDotValue(node)) return;
        if (node.parent?.type === "AssignmentExpression" && node.parent.left === node) return;
        candidates.push({ node, kind: "read", name: node.object.name });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!names.has(candidate.name)) continue;
          const { node, name, kind, operator } = candidate;
          if (kind === "read") {
            context.report({
              node,
              message: MESSAGES.read,
              suggest: [{ desc: `Rewrite as ${name}.get()`, fix: fixer => fixer.replaceText(node, `${name}.get()`) }],
            });
            continue;
          }
          const right = (context.sourceCode ?? context.getSourceCode()).getText(node.right);
          const replacement =
            kind === "compound" ? `${name}.set(${name}.get() ${operator} (${right}))` : `${name}.set(${right})`;
          context.report({
            node,
            message: kind === "compound" ? MESSAGES.compound : MESSAGES.write,
            suggest: [{ desc: `Rewrite as ${name}.set(...)`, fix: fixer => fixer.replaceText(node, replacement) }],
          });
        }
      },
    };
  },
};

const animatedUpdaterPurity = {
  meta: { type: "problem" },
  createOnce(context) {
    let depth = 0;
    return {
      before() {
        depth = 0;
      },
      CallExpression(node) {
        const name = calleeName(node);
        if (UPDATER_HOOKS.has(name)) {
          depth += 1;
          return;
        }
        if (depth === 0) return;
        if (name === "set" || name === "modify") {
          if (node.callee?.type !== "MemberExpression") return;
          context.report({
            node,
            message: `Do not call \`.${name}()\` inside useAnimatedStyle/useAnimatedProps. Animated updaters must be pure; move the write to an event, effect, derived value, or reaction.`,
          });
          return;
        }
        if (name !== "scheduleOnRN") return;
        context.report({ node, message: MESSAGES.updaterSideEffect });
      },
      "CallExpression:exit"(node) {
        if (UPDATER_HOOKS.has(calleeName(node))) depth -= 1;
      },
    };
  },
};

const guardsComparison = (node, first, second) => {
  if (!first || !second) return false;
  const compares = test => {
    if (!test) return false;
    if (test.type === "BinaryExpression" && (test.operator === "!==" || test.operator === "!=")) {
      const left = test.left?.name;
      const right = test.right?.name;
      return (left === first && right === second) || (left === second && right === first);
    }
    if (test.type === "UnaryExpression" && test.operator === "!" && calleeName(test.argument) === "is") {
      const names = test.argument.arguments ?? [];
      return names.some(entry => entry.name === first) && names.some(entry => entry.name === second);
    }
    return false;
  };
  return hasAncestor(node, current => current.type === "IfStatement" && compares(current.test));
};

const animatedReactionSafety = {
  meta: { type: "problem" },
  createOnce(context) {
    let stack = [];
    return {
      before() {
        stack = [];
        return gate(context, "useAnimatedReaction");
      },
      CallExpression(node) {
        const name = calleeName(node);
        if (REACTION_HOOKS.has(name)) {
          stack.push(node);
          return;
        }
        const reaction = stack.length > 0 ? stack[stack.length - 1] : null;
        if (!reaction) return;
        if (name === "set" || name === "modify") {
          if (node.callee?.type !== "MemberExpression") return;
          const shared = receiverName(node);
          if (!shared) return;
          const prepare = reaction.arguments?.[0];
          const react = reaction.arguments?.[1];
          if (!prepare || !react || !isWithin(node, react)) return;
          const readsShared = subtreeHas(
            prepare,
            current => isMemberCall(current, "get") && receiverName(current) === shared
          );
          if (!readsShared) return;
          context.report({
            node,
            message: `A useAnimatedReaction result callback must not ${
              name === "set" ? "write" : "modify"
            } a shared value read by its prepare callback; this creates an infinite loop.`,
          });
          return;
        }
        if (name !== "scheduleOnRN") return;
        const callback = reaction.arguments?.[1];
        if (!callback || !FUNCTION_TYPES.has(callback.type)) return;
        const params = callback.params ?? [];
        const current = params[0]?.type === "Identifier" ? params[0].name : null;
        const previous = params[1]?.type === "Identifier" ? params[1].name : null;
        if (!previous) {
          context.report({ node, message: MESSAGES.hotBridgeNoPrevious });
          return;
        }
        if (guardsComparison(node, current, previous)) return;
        context.report({ node, message: MESSAGES.hotBridgeUnguarded });
      },
      "CallExpression:exit"(node) {
        if (REACTION_HOOKS.has(calleeName(node))) stack.pop();
      },
    };
  },
};

const scheduleOnRnScope = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "scheduleOnRN");
      },
      CallExpression(node) {
        if (calleeName(node) !== "scheduleOnRN") return;
        for (const argument of node.arguments ?? []) {
          collectFunctions(argument, found => {
            context.report({ node: found, message: MESSAGES.inlineCallback });
          });
        }
      },
    };
  },
};

const findBuilderCall = value => {
  let found = null;
  subtreeHas(value, current => {
    if (
      current.type === "CallExpression" &&
      current.callee?.type === "MemberExpression" &&
      current.callee.property?.type === "Identifier" &&
      LAYOUT_BUILDER_METHODS.has(current.callee.property.name)
    ) {
      found = current;
      return true;
    }
    return false;
  });
  return found;
};

const hoistLayoutAnimationBuilder = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXAttribute(node) {
        if (!LAYOUT_ATTRIBUTES.has(node.name?.name)) return;
        if (!hasAncestor(node, current => FUNCTION_TYPES.has(current.type))) return;
        const builderCall = findBuilderCall(node.value);
        if (!builderCall) return;
        context.report({ node: builderCall, message: MESSAGES.layoutBuilder });
      },
    };
  },
};

const preferLazySharedValueInitializer = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "useSharedValue");
      },
      CallExpression(node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "useSharedValue") return;
        const argument = node.arguments?.[0];
        if (!argument) return;
        const eager =
          (argument.type === "CallExpression" && argument.callee?.type === "Identifier") ||
          argument.type === "NewExpression";
        if (!eager) return;
        context.report({ node, message: MESSAGES.eagerInitializer });
      },
    };
  },
};

const sharedValueUsage = {
  meta: { type: "problem" },
  createOnce(context) {
    const names = new Set();
    const candidates = [];
    return {
      before() {
        names.clear();
        candidates.length = 0;
      },
      VariableDeclarator(node) {
        if (node.id?.type === "Identifier" && isProducerCall(node.init)) {
          names.add(node.id.name);
          return;
        }
        if (node.id?.type !== "ObjectPattern") return;
        if (node.init?.type !== "CallExpression" || node.init.callee?.name !== "useSharedValue") return;
        const destructuresValue = (node.id.properties ?? []).some(
          property => property.key?.type === "Identifier" && property.key.name === "value"
        );
        if (destructuresValue) context.report({ node, message: MESSAGES.destructure });
      },
      AssignmentExpression(node) {
        if (node.left?.type !== "MemberExpression") return;
        if (!isMemberCall(node.left.object, "get")) return;
        context.report({ node, message: MESSAGES.nestedProperty });
      },
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.property?.type === "Identifier" &&
          MUTATING_METHODS.has(node.callee.property.name) &&
          isMemberCall(node.callee.object, "get")
        ) {
          context.report({ node, message: MESSAGES.nestedCollection });
          return;
        }
        const isGet = isMemberCall(node, "get") && (node.arguments ?? []).length === 0;
        const isSet = isMemberCall(node, "set");
        if (!isGet && !isSet) return;
        const shared = receiverName(node);
        if (!shared) return;
        const host = closestAncestor(node, JSX_HOSTS);
        if (!host) return;
        if (crossesFunctionBefore(node, host, FUNCTION_TYPES)) return;
        if (subtreeHas(host, current => FUNCTION_TYPES.has(current.type))) return;
        candidates.push({ node, shared, isGet });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!names.has(candidate.shared)) continue;
          context.report({
            node: candidate.node,
            message: candidate.isGet ? MESSAGES.renderRead : MESSAGES.renderWrite,
          });
        }
      },
    };
  },
};

const skiaPerformance = {
  meta: { type: "problem" },
  createOnce(context) {
    const canvasLocals = new Set();
    const elements = [];
    return {
      before() {
        canvasLocals.clear();
        elements.length = 0;
        return gate(context, "react-native-skia");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "@shopify/react-native-skia")) {
          if (specifier.type !== "ImportSpecifier") continue;
          const imported = specifier.imported?.name;
          const local = specifier.local?.name;
          if (imported === "Canvas" && /Canvas$/.test(local ?? "")) canvasLocals.add(local);
          if (PATH_HOOKS.has(imported)) context.report({ node: specifier, message: MESSAGES.pathHooks });
        }
      },
      JSXOpeningElement(node) {
        const name = tagIdentifier(node.name);
        if (!name.endsWith("Canvas")) return;
        const hasOpaque = (node.attributes ?? []).some(
          attribute => attribute.type === "JSXAttribute" && attribute.name?.name === "opaque"
        );
        if (hasOpaque) return;
        elements.push({ node, name });
      },
      "Program:exit"() {
        for (const element of elements) {
          if (!canvasLocals.has(element.name)) continue;
          context.report({ node: element.node, message: MESSAGES.canvasMode });
        }
      },
    };
  },
};

const noReactStateFromContinuousWorklet = {
  meta: { type: "problem" },
  createOnce(context) {
    const setters = new Set();
    const pending = [];
    let useStateFromReact = false;
    let scheduleFromWorklets = false;
    return {
      before() {
        setters.clear();
        pending.length = 0;
        useStateFromReact = false;
        scheduleFromWorklets = false;
        return gate(context, "scheduleOnRN");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "react")) {
          if (specifier.type === "ImportSpecifier" && specifier.imported?.name === "useState") {
            useStateFromReact = true;
          }
        }
        for (const specifier of importedSpecifiers(node, "react-native-worklets")) {
          if (specifier.type === "ImportSpecifier" && specifier.imported?.name === "scheduleOnRN") {
            scheduleFromWorklets = true;
          }
        }
      },
      VariableDeclarator(node) {
        if (node.id?.type !== "ArrayPattern") return;
        if (node.init?.type !== "CallExpression" || node.init.callee?.name !== "useState") return;
        const setter = node.id.elements?.[1];
        if (setter?.type === "Identifier") setters.add(setter.name);
      },
      CallExpression(node) {
        if (calleeName(node) !== "scheduleOnRN") return;
        const target = node.arguments?.[0];
        if (target?.type !== "Identifier") return;
        if (!enclosingCall(node, CONTINUOUS_HOOKS)) return;
        pending.push({ node, name: target.name });
      },
      "Program:exit"() {
        if (!useStateFromReact || !scheduleFromWorklets) return;
        for (const entry of pending) {
          if (!setters.has(entry.name)) continue;
          context.report({ node: entry.node, message: MESSAGES.continuousWorkletState });
        }
      },
    };
  },
};

const requireTurboImageResize = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "TurboImage");
      },
      JSXOpeningElement(node) {
        if (!tagIdentifier(node.name).endsWith("TurboImage")) return;
        const attributes = node.attributes ?? [];
        if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
        const hasResize = attributes.some(
          attribute => attribute.type === "JSXAttribute" && attribute.name?.name === "resize"
        );
        if (hasResize) return;
        context.report({
          node: node.name,
          message:
            "TurboImage must set `resize` so the native decoder downsamples before the bitmap reaches memory. Decoding at full source resolution wastes memory - a 4000px photo in a 100pt avatar holds roughly 48MB of decoded pixels - and stalls the first frame. Pick a value slightly BELOW the rendered width, never above it: rounding down costs nothing visible, rounding up re-introduces the oversized decode the prop exists to avoid.",
        });
      },
    };
  },
};

const TOUCHABLES = new Set(["Pressable", "PressableScale", "TouchableOpacity", "TouchableHighlight"]);

const noConditionalStyleArray = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "style") return;
        const value = node.value;
        if (value?.type !== "JSXExpressionContainer") return;
        const array = value.expression;
        if (array?.type !== "ArrayExpression") return;
        for (const element of array.elements ?? []) {
          if (element?.type !== "ConditionalExpression" && element?.type !== "LogicalExpression") continue;
          context.report({
            node: element,
            message:
              "Move the condition into a Unistyles dynamic style function: `card: (active: boolean) => ({ ... })`, then `style={styles.card(active)}`. A conditional entry can evaluate to a falsy hole, which shifts the array indices and breaks the Unistyles C++ proxy.",
          });
        }
      },
    };
  },
};

const noRnNamespaceImport = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "react-native");
      },
      ImportDeclaration(node) {
        if (node.source?.value !== "react-native") return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.type !== "ImportNamespaceSpecifier") continue;
          context.report({
            node: specifier,
            message:
              "namespace import of react-native defeats Metro platform shaking (dead `Platform.OS` branches ship in both bundles). Import the specific APIs by name.",
          });
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source?.value !== "react-native") return;
        for (const specifier of node.specifiers ?? []) {
          if (specifier.local?.name !== "Platform") continue;
          context.report({
            node: specifier,
            message:
              "re-exporting Platform from react-native defeats Metro platform shaking. Consumers must import Platform directly from react-native.",
          });
        }
      },
    };
  },
};

const noUnlabeledIconPressable = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        const tag = tagIdentifier(opening?.name);
        if (!TOUCHABLES.has(tag)) return;
        const attributes = opening?.attributes ?? [];
        const labelled = attributes.some(
          attribute =>
            attribute.type === "JSXAttribute" &&
            (attribute.name?.name === "accessibilityLabel" || attribute.name?.name === "accessibilityHint")
        );
        if (labelled) return;
        const children = node.children ?? [];
        let hasIcon = false;
        let hasText = false;
        let hasExpression = false;
        for (const child of children) {
          if (child.type === "JSXExpressionContainer") hasExpression = true;
          if (child.type !== "JSXElement") continue;
          const childTag = tagIdentifier(child.openingElement?.name);
          if (childTag === "Text") hasText = true;
          if (childTag.endsWith("Icon")) hasIcon = true;
        }
        if (!hasIcon || hasText || hasExpression) return;
        context.report({
          node: opening.name,
          message:
            "icon-only touchable has no accessible name. Add an accessibilityLabel / accessibilityHint, or include a visible <Text>.",
        });
      },
      JSXOpeningElement(node) {
        if (node.selfClosing !== true) return;
        if (tagIdentifier(node.name) !== "Button") return;
        const attributes = node.attributes ?? [];
        const names = new Set(
          attributes
            .filter(a => a.type === "JSXAttribute")
            .map(a => a.name?.name)
            .filter(Boolean)
        );
        if (!names.has("systemImage")) return;
        if (
          names.has("label") ||
          names.has("accessibilityLabel") ||
          names.has("accessibilityHint") ||
          names.has("modifiers")
        ) {
          return;
        }
        context.report({
          node: node.name,
          message:
            "icon-only Expo UI <Button> has no accessible name. Add a `label`, or an accessibilityLabel(...) modifier.",
        });
      },
    };
  },
};

const BOOLEAN_OPERATORS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

const isDefinitelyBoolean = node => {
  if (!node) return false;
  if (node.type === "UnaryExpression" && node.operator === "!") return true;
  if (node.type === "BinaryExpression") return BOOLEAN_OPERATORS.has(node.operator);
  if (node.type === "Literal") return typeof node.value === "boolean";
  if (node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === "Boolean") {
    return true;
  }
  if (node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||")) {
    return isDefinitelyBoolean(node.left) && isDefinitelyBoolean(node.right);
  }
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression")
    return isDefinitelyBoolean(node.expression);
  return false;
};

const isLengthGuard = node => {
  if (node?.type === "MemberExpression") return node.property?.name === "length";
  if (node?.type === "LogicalExpression" && node.operator === "&&") return isLengthGuard(node.right);
  return false;
};

const noLeakedRender = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXExpressionContainer(node) {
        const parentType = node.parent?.type;
        if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;
        const expression = node.expression;
        if (expression?.type !== "LogicalExpression" || expression.operator !== "&&") return;
        if (!isLengthGuard(expression.left)) return;
        if (isDefinitelyBoolean(expression.left)) return;
        context.report({
          node: expression,
          message:
            'A `&&` guard in JSX leaks its left operand when it is falsy: `0` renders a bare zero - a hard crash in React Native, "Text strings must be rendered within a <Text> component" - and `""` renders nothing silently. Coerce with `!!`, compare explicitly (`list.length > 0 &&`), or use a ternary with `null`.',
        });
      },
    };
  },
};

const hasUriProperty = node => {
  const expression = node?.value?.type === "JSXExpressionContainer" ? node.value.expression : null;
  if (expression?.type !== "ObjectExpression") return false;
  return (expression.properties ?? []).some(
    property =>
      (property.type === "Property" || property.type === "ObjectProperty") &&
      (property.key?.name ?? property.key?.value) === "uri"
  );
};

const noRnImageNetworkSource = {
  meta: { type: "problem" },
  createOnce(context) {
    const imageBindings = new Set();
    const candidates = [];
    return {
      before() {
        imageBindings.clear();
        candidates.length = 0;
        return gate(context, "source");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "react-native")) {
          if (specifier.type === "ImportSpecifier" && specifier.imported?.name === "Image") {
            imageBindings.add(specifier.local?.name ?? "Image");
          }
        }
      },
      JSXOpeningElement(node) {
        const tag = tagIdentifier(node.name);
        if (tag === "") return;
        const source = (node.attributes ?? []).find(
          attribute => attribute.type === "JSXAttribute" && attribute.name?.name === "source"
        );
        if (!source || !hasUriProperty(source)) return;
        candidates.push({ node: node.name, tag });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!imageBindings.has(candidate.tag)) continue;
          context.report({
            node: candidate.node,
            message:
              "react-native <Image> with a network `{ uri }` source. Use TurboImage (react-native-turbo-image) with `resize` and `cachePolicy` for network images; RN Image has no disk cache and no decode sizing, so it re-downloads on every cold start. Keep it for local `require(...)` assets.",
          });
        }
      },
    };
  },
};

const LAYOUT_ONLY_PROPS = new Set(["style"]);

const MERGEABLE_WRAPPERS = new Set(["View", "Animated.View"]);

const fullTagName = name => {
  if (name?.type === "JSXIdentifier") return name.name;
  if (name?.type !== "JSXMemberExpression") return "";
  const object = fullTagName(name.object);
  const property = name.property?.name ?? "";
  return object === "" || property === "" ? "" : `${object}.${property}`;
};

const elementChildren = node =>
  (node.children ?? []).filter(child => child.type !== "JSXText" || (child.value ?? "").trim() !== "");

const onlyLayoutProps = opening =>
  (opening?.attributes ?? []).every(
    attribute => attribute.type === "JSXAttribute" && LAYOUT_ONLY_PROPS.has(attribute.name?.name ?? "")
  );

const noRedundantViewNesting = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXElement(node) {
        const tag = fullTagName(node.openingElement?.name);
        if (!MERGEABLE_WRAPPERS.has(tag)) return;
        if (!onlyLayoutProps(node.openingElement)) return;
        const children = elementChildren(node);
        if (children.length !== 1) return;
        const child = children[0];
        if (child.type !== "JSXElement") return;
        if (fullTagName(child.openingElement?.name) !== tag) return;
        if (!onlyLayoutProps(child.openingElement)) return;
        context.report({
          node: node.openingElement.name,
          message: `This <${tag}> only wraps another <${tag}>, and neither carries anything but a style. Merge the two style objects into one. Every extra host view is a real node in the native tree and costs layout and memory.`,
        });
      },
    };
  },
};

const LAYOUT_PROPS = new Set([
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "top",
  "left",
  "right",
  "bottom",
  "start",
  "end",
  "flex",
  "flexBasis",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingStart",
  "paddingEnd",
  "paddingHorizontal",
  "paddingVertical",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginEnd",
  "marginHorizontal",
  "marginVertical",
  "gap",
  "rowGap",
  "columnGap",
]);

const SCROLL_HANDLERS = new Set(["onScroll", "onScrollBeginDrag", "onScrollEndDrag", "onMomentumScrollEnd"]);
const KEYBOARD_WILL_EVENTS = new Set(["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame"]);
const ANIMATED_STYLE_HOOKS = new Set(["useAnimatedStyle", "useAnimatedProps"]);
const COMPONENT_NAME = /^[A-Z]/;
const REACT_FUNCTION_NAME = /^(?:[A-Z]|use[A-Z])/;
const STATE_SETTER = /^set[A-Z]/;

const NEW_MESSAGES = {
  gpuPropertiesOnly:
    "Animating this property recalculates layout on every frame. Animate transform and opacity instead: a panel that grows is scaleY with transformOrigin, a thing that slides is translateY.",
  needsAnimatedComponent:
    "This is an animated style, so the element has to be an Animated.* component. On a plain one the style is applied once at mount and never updates again - nothing errors, the view simply does not move.",
  interpolateNeedsClamp:
    "Pass Extrapolation.CLAMP as the fourth argument. Without it interpolate keeps extrapolating past the ends of the input range, so a scroll offset of 400 against a [0, 100] range carries the output well past where it was meant to stop.",
  turboImageCachePolicy:
    'Add a cachePolicy (normally "dataCache"). Without it the image is re-fetched over the network on every cold start, so a feed the user already scrolled costs its bandwidth again and shows placeholders on a slow connection.',
  keyboardAvoidingView:
    "Import KeyboardAvoidingView from react-native-keyboard-controller: same props, and it follows the keyboard per frame. React Native's listens for keyboardDidShow, which Android fires after the animation finishes, and it never subscribes to WindowInsetsAnimationCallback - under edge-to-edge that leaves the input sitting under the keyboard. For a scrolling form use KeyboardAwareScrollView, and for something that only has to move, rt.insets.ime needs no component at all.",
  keyboardWillEvent:
    "keyboardWill* events are iOS-only: on Android the listener is registered and never fires, so whatever it drives silently does nothing on half the devices. Drive the animation from rt.insets.ime, which is per-frame on both platforms, or use a component from react-native-keyboard-controller.",
  scrollPositionState:
    "Scroll fires every frame, so setting React state here re-renders the screen every frame. Use useAnimatedScrollHandler with a shared value when it drives an animation, or a ref when nothing renders from it.",
};

const jsxTagName = node => {
  const name = node.openingElement?.name ?? node.name;
  if (name?.type === "JSXIdentifier") return name.name;
  if (name?.type === "JSXMemberExpression") return `${name.object?.name}.${name.property?.name}`;
  return null;
};

const styleKeyName = property =>
  property.key?.type === "Identifier"
    ? property.key.name
    : property.key?.type === "Literal"
      ? String(property.key.value)
      : null;

const gpuPropertiesOnly = {
  meta: { type: "problem" },
  createOnce(context) {
    let depth = 0;
    return {
      before() {
        depth = 0;
        return gate(context, "useAnimatedStyle", "useAnimatedProps");
      },
      CallExpression(node) {
        if (ANIMATED_STYLE_HOOKS.has(calleeName(node))) depth += 1;
      },
      "CallExpression:exit"(node) {
        if (ANIMATED_STYLE_HOOKS.has(calleeName(node))) depth -= 1;
      },
      Property(node) {
        if (depth === 0) return;
        const name = styleKeyName(node);
        if (name !== null && LAYOUT_PROPS.has(name)) {
          context.report({ node, message: NEW_MESSAGES.gpuPropertiesOnly });
        }
      },
    };
  },
};

const ANIMATED_COMPONENT_FACTORIES = new Set(["createAnimatedComponent", "withUnistyles", "withAnimated"]);

const animatedStyleNeedsAnimatedComponent = {
  meta: { type: "problem" },
  createOnce(context) {
    let animatedStyles;
    let animatedComponents;
    let candidates;
    return {
      before() {
        animatedStyles = new Set();
        animatedComponents = new Set();
        candidates = [];
        return gate(context, "useAnimatedStyle", "useAnimatedProps");
      },
      VariableDeclarator(node) {
        if (node.id?.type !== "Identifier") return;
        if (node.init?.type !== "CallExpression") return;
        const callee = calleeName(node.init);
        if (ANIMATED_STYLE_HOOKS.has(callee)) animatedStyles.add(node.id.name);
        else if (ANIMATED_COMPONENT_FACTORIES.has(callee)) animatedComponents.add(node.id.name);
      },
      ImportDeclaration(node) {
        for (const specifier of node.specifiers ?? []) {
          const local = specifier.local?.name;
          if (local !== undefined && local.startsWith("Animated")) animatedComponents.add(local);
        }
      },
      "Program:exit"() {
        if (animatedStyles.size === 0) return;
        for (const { node, tag, referenced } of candidates) {
          if (animatedComponents.has(tag)) continue;
          if (!referenced.some(name => animatedStyles.has(name))) continue;
          context.report({ node, message: NEW_MESSAGES.needsAnimatedComponent });
        }
      },
      JSXAttribute(node) {
        if (attributeName(node) !== "style") return;

        const tag = jsxTagName(node.parent ?? {});
        if (tag === null || tag.startsWith("Animated")) return;

        const expression = node.value?.type === "JSXExpressionContainer" ? node.value.expression : null;
        const referenced =
          expression?.type === "Identifier"
            ? [expression.name]
            : expression?.type === "ArrayExpression"
              ? expression.elements.filter(element => element?.type === "Identifier").map(element => element.name)
              : [];
        if (referenced.length === 0) return;
        candidates.push({ node, tag, referenced });
      },
    };
  },
};

// Only a bare `interpolate(...)` call, so an unrelated `something.interpolate()`
// on another object is not mistaken for Reanimated's.
const interpolateNeedsClamp = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "interpolate");
      },
      CallExpression(node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "interpolate") return;
        if ((node.arguments?.length ?? 0) !== 3) return;
        if ((node.arguments ?? []).some(argument => argument?.type === "SpreadElement")) return;
        context.report({ node, message: NEW_MESSAGES.interpolateNeedsClamp });
      },
    };
  },
};

const requireTurboImageCachePolicy = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "TurboImage");
      },
      JSXOpeningElement(node) {
        if (!tagIdentifier(node.name).endsWith("TurboImage")) return;
        const attributes = node.attributes ?? [];
        if (attributes.some(attribute => attribute.type === "JSXSpreadAttribute")) return;
        if (attributes.some(attribute => attributeName(attribute) === "cachePolicy")) return;
        context.report({ node: node.name, message: NEW_MESSAGES.turboImageCachePolicy });
      },
    };
  },
};

const keyboardAvoidingViewSource = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "KeyboardAvoidingView");
      },
      ImportDeclaration(node) {
        for (const specifier of importedSpecifiers(node, "react-native")) {
          if (specifier.type !== "ImportSpecifier") continue;
          if (specifier.imported?.name !== "KeyboardAvoidingView") continue;
          context.report({ node: specifier, message: NEW_MESSAGES.keyboardAvoidingView });
        }
      },
    };
  },
};

// Every occurrence of the string counts, not only a listener argument: the
// event does not exist on Android wherever the name is written.
const noKeyboardWillEvents = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "keyboardWill");
      },
      Literal(node) {
        if (typeof node.value !== "string" || !KEYBOARD_WILL_EVENTS.has(node.value)) return;
        context.report({ node, message: NEW_MESSAGES.keyboardWillEvent });
      },
    };
  },
};

const noScrollPositionState = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      before() {
        return gate(context, "onScroll");
      },
      JSXAttribute(node) {
        if (!SCROLL_HANDLERS.has(attributeName(node))) return;
        const expression = node.value?.type === "JSXExpressionContainer" ? node.value.expression : null;
        if (!FUNCTION_TYPES.has(expression?.type)) return;
        const setsState = subtreeHas(
          expression.body,
          current =>
            current.type === "CallExpression" &&
            current.callee?.type === "Identifier" &&
            STATE_SETTER.test(current.callee.name)
        );
        if (setsState) context.report({ node, message: NEW_MESSAGES.scrollPositionState });
      },
    };
  },
};

const boundFunctionName = node =>
  node.type === "FunctionDeclaration" ? (node.id?.name ?? null) : (node.parent?.id?.name ?? null);

const enclosingReactFunction = node => {
  for (let current = node.parent; current; current = current.parent) {
    if (!FUNCTION_TYPES.has(current.type)) continue;
    const name = boundFunctionName(current);
    if (name !== null && REACT_FUNCTION_NAME.test(name)) return current;
  }
  return null;
};

const scopeContains = (scope, ancestor) => {
  for (let current = scope; current !== null && current !== undefined; current = current.upper) {
    if (current === ancestor) return true;
  }
  return false;
};

const hoistStatelessFunction = {
  meta: { type: "problem" },
  createOnce(context) {
    const check = node => {
      const name = boundFunctionName(node);
      if (name === null || COMPONENT_NAME.test(name)) return;

      const component = enclosingReactFunction(node);
      if (component === null) return;

      const scope = context.sourceCode?.getScope?.(node);
      const componentScope = context.sourceCode?.getScope?.(component);
      if (scope === null || scope === undefined || componentScope === null || componentScope === undefined) return;

      for (const reference of scope.through ?? []) {
        if (scopeContains(reference.resolved?.scope, componentScope)) return;
      }

      context.report({
        node,
        message: `\`${name}\` reads nothing from the component around it, so move it to module scope. There it is created once instead of on every render, its identity is stable without memoising anything, and a test can call it without rendering. If it was supposed to read a prop or a piece of state, that is the bug this is pointing at.`,
      });
    };
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

// `memo` only from a bare call or off `React`, so a `cache.memo(...)` on some
// unrelated object is not mistaken for the React one.
const memoCalleeName = node => {
  const callee = node.callee;
  if (callee?.type === "Identifier") {
    if (MEMO_HOOKS.has(callee.name) || callee.name === "memo") return callee.name;
    return null;
  }
  if (callee?.type !== "MemberExpression" || callee.computed === true) return null;
  if (callee.object?.name !== "React") return null;
  const property = callee.property?.name;
  return MEMO_HOOKS.has(property) || property === "memo" ? property : null;
};

// One pass over the source, then a binary search per call site, so a large file
// with several memos does not re-scan itself once per report.
const lineFinder = text => {
  const starts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1);
  }

  return offset => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  };
};

// The React Compiler memoises everything it can, so a hand-written memo is
// normally either redundant or a fight with it. The compiler cannot see two
// things, which is why this is not a flat ban: how many times a list row will
// render, and what is expensive. Both are claims a person makes, so the rule
// asks for the claim in writing.
const noManualMemo = {
  meta: { type: "problem" },
  createOnce(context) {
    let calls;
    return {
      before() {
        calls = [];
        return gate(context, "useMemo", "useCallback", "memo");
      },
      CallExpression(node) {
        const name = memoCalleeName(node);
        if (name !== null) calls.push({ node, name });
      },
      "Program:exit"() {
        if (calls.length === 0) return;

        const text = context.sourceCode?.getText?.() ?? "";
        const lineOf = lineFinder(text);
        const justified = new Set();

        for (const comment of context.sourceCode?.getAllComments?.() ?? []) {
          if (!/^why:/i.test((comment.value ?? "").trim())) continue;
          for (let line = lineOf(comment.start); line <= lineOf(comment.end); line++) justified.add(line);
        }

        for (const { node, name } of calls) {
          const line = lineOf(node.start);
          if (justified.has(line) || justified.has(line - 1)) continue;

          context.report({
            node,
            message: `The React Compiler already memoises this, so a hand-written \`${name}\` is usually fighting it rather than helping. Two cases earn one, because the compiler cannot see either: something rendered per row in a list, and a computation or component heavy enough that you measured it. Keep it by writing a \`why:\` comment on the line above saying which one this is.`,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "rn" },
  rules: {
    "animated-reaction-safety": animatedReactionSafety,
    "animated-style-needs-animated-component": animatedStyleNeedsAnimatedComponent,
    "animated-updater-purity": animatedUpdaterPurity,
    "gpu-properties-only": gpuPropertiesOnly,
    "hoist-layout-animation-builder": hoistLayoutAnimationBuilder,
    "hoist-stateless-function": hoistStatelessFunction,
    "interpolate-needs-clamp": interpolateNeedsClamp,
    "keyboard-avoiding-view-source": keyboardAvoidingViewSource,
    "no-keyboard-will-events": noKeyboardWillEvents,
    "no-scroll-position-state": noScrollPositionState,
    "no-conditional-style-array": noConditionalStyleArray,
    "no-leaked-render": noLeakedRender,
    "no-rn-image-network-source": noRnImageNetworkSource,
    "no-redundant-view-nesting": noRedundantViewNesting,
    "no-react-state-from-continuous-worklet": noReactStateFromContinuousWorklet,
    "no-rn-namespace-import": noRnNamespaceImport,
    "no-unlabeled-icon-pressable": noUnlabeledIconPressable,
    "no-shared-value-dot-value": noSharedValueDotValue,
    "no-manual-memo": noManualMemo,
    "prefer-lazy-shared-value-initializer": preferLazySharedValueInitializer,
    "require-turbo-image-resize": requireTurboImageResize,
    "require-turbo-image-cache-policy": requireTurboImageCachePolicy,
    "schedule-on-rn-scope": scheduleOnRnScope,
    "shared-value-usage": sharedValueUsage,
    "skia-performance": skiaPerformance,
  },
};
