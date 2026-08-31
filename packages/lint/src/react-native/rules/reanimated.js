// @ashstack/lint — Reanimated rules.
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
} from "../../lib/ast.js";

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

const ANIMATED_STYLE_HOOKS = new Set(["useAnimatedStyle", "useAnimatedProps"]);

const ANIMATED_COMPONENT_FACTORIES = new Set(["createAnimatedComponent", "withUnistyles", "withAnimated"]);

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
  continuousWorkletState:
    "A continuously evaluated worklet schedules a React state update, which can put a Fabric commit or Skia re-recording on an animation frame. Keep the gate in shared/native state or apply it through an imperative ref.",
};

const NEW_MESSAGES = {
  gpuPropertiesOnly:
    "Animating this property recalculates layout on every frame. Animate transform and opacity instead: a panel that grows is scaleY with transformOrigin, a thing that slides is translateY.",
  needsAnimatedComponent:
    "This is an animated style, so the element has to be an Animated.* component. On a plain one the style is applied once at mount and never updates again - nothing errors, the view simply does not move.",
  interpolateNeedsClamp:
    "Pass Extrapolation.CLAMP as the fourth argument. Without it interpolate keeps extrapolating past the ends of the input range, so a scroll offset of 400 against a [0, 100] range carries the output well past where it was meant to stop.",
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

const noSharedValueDotValue = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reading or writing a shared value's `.value`; use `.get()` and `.set(...)` so React Compiler can track the read or the mutation.",
    },
    hasSuggestions: true,
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `.set()`, `.modify()` and `scheduleOnRN` inside useAnimatedStyle or useAnimatedProps; an animated updater must stay pure, so move the write to an event, effect, derived value or reaction.",
    },
  },
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

const animatedReactionSafety = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a useAnimatedReaction result callback writing a shared value its prepare callback reads (an infinite loop) or calling scheduleOnRN without comparing the current and previous results, which bridges to RN every frame.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline function arguments to `scheduleOnRN`; an inline callback has ambiguous runtime ownership and can be created on the wrong runtime, so pass one declared in RN Runtime scope.",
    },
  },
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

const hoistLayoutAnimationBuilder = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow constructing a Reanimated layout-animation builder inside a component's `entering`, `exiting` or `layout` prop; build static builders at module scope and memoize ones that depend on component values.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a lazy initializer for a computed `useSharedValue(...)`; an eager call or `new` expression runs on every React render even though only the first result is kept.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow destructuring a shared value, mutating what its `get()` returned, and reading or writing it while JSX is evaluated; each detaches the value from Reanimated reactivity or makes render impure.",
    },
  },
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

const noReactStateFromContinuousWorklet = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow scheduling a React state setter through `scheduleOnRN` from a continuously evaluated worklet; it can put a Fabric commit or a Skia re-recording on an animation frame.",
    },
  },
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

const gpuPropertiesOnly = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow animating layout properties in useAnimatedStyle or useAnimatedProps; they recalculate layout on every frame, so animate transform and opacity instead.",
    },
  },
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

const animatedStyleNeedsAnimatedComponent = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require an `Animated.*` component wherever a useAnimatedStyle or useAnimatedProps result is passed as `style`; on a plain component the style is applied once at mount and silently never updates.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Require an explicit `Extrapolation.CLAMP` fourth argument on a bare `interpolate()` call; without it the output keeps extrapolating past the ends of the input range.",
    },
  },
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

export default {
  meta: { name: "@ashstack/reanimated" },
  rules: {
    "animated-reaction-safety": animatedReactionSafety,
    "animated-style-needs-animated-component": animatedStyleNeedsAnimatedComponent,
    "animated-updater-purity": animatedUpdaterPurity,
    "gpu-properties-only": gpuPropertiesOnly,
    "hoist-layout-animation-builder": hoistLayoutAnimationBuilder,
    "interpolate-needs-clamp": interpolateNeedsClamp,
    "no-shared-value-dot-value": noSharedValueDotValue,
    "no-react-state-from-continuous-worklet": noReactStateFromContinuousWorklet,
    "prefer-lazy-shared-value-initializer": preferLazySharedValueInitializer,
    "schedule-on-rn-scope": scheduleOnRnScope,
    "shared-value-usage": sharedValueUsage,
  },
};
