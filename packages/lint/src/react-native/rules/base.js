// @ashstack/lint — general React Native rules.
//
// Every rule is plain AST work. The ones that can be decided from source text
// first gate on it in `before()`, so a file that cannot contain a violation is
// skipped before its AST is walked. Gates fail OPEN: when the text is not
// available the rule still runs, because a missed gate costs milliseconds and a
// wrong gate costs correctness.

import { attributeName, importedSpecifiers, subtreeHas, tagIdentifier } from "../../lib/ast.js";

const gate = (context, ...markers) => {
  const text = context.sourceCode?.getText?.();
  return typeof text !== "string" || markers.some(marker => text.includes(marker));
};

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);

const TOUCHABLES = new Set(["Pressable", "PressableScale", "TouchableOpacity", "TouchableHighlight"]);

const BOOLEAN_OPERATORS = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in", "instanceof"]);

const LAYOUT_ONLY_PROPS = new Set(["style"]);

const MERGEABLE_WRAPPERS = new Set(["View", "Animated.View"]);

const SCROLL_HANDLERS = new Set(["onScroll", "onScrollBeginDrag", "onScrollEndDrag", "onMomentumScrollEnd"]);
const KEYBOARD_WILL_EVENTS = new Set(["keyboardWillShow", "keyboardWillHide", "keyboardWillChangeFrame"]);

const COMPONENT_NAME = /^[A-Z]/;
const REACT_FUNCTION_NAME = /^(?:[A-Z]|use[A-Z])/;
const STATE_SETTER = /^set[A-Z]/;

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

const NEW_MESSAGES = {
  keyboardWillEvent:
    "keyboardWill* events are iOS-only: on Android the listener is registered and never fires, so whatever it drives silently does nothing on half the devices. Drive the animation from rt.insets.ime, which is per-frame on both platforms, or use a component from react-native-keyboard-controller.",
  scrollPositionState:
    "Scroll fires every frame, so setting React state here re-renders the screen every frame. Use useAnimatedScrollHandler with a shared value when it drives an animation, or a ref when nothing renders from it.",
};

const noConditionalStyleArray = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow conditional or logical entries inside a JSX `style` array; an entry that evaluates falsy leaves a hole that shifts the array indices and breaks the Unistyles C++ proxy.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow namespace-importing react-native or re-exporting its `Platform`; both defeat Metro's platform shaking, so dead `Platform.OS` branches ship in both bundles.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Require an accessible name on an icon-only touchable or an icon-only Expo UI `<Button>`; with no label, hint or visible text the control is unreachable to a screen reader.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow guarding JSX with a `&&` on a `.length` expression; the falsy left operand leaks into the output, and a bare `0` crashes React Native with "Text strings must be rendered within a <Text> component".',
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a react-native `<Image>` with a network `{ uri }` source; it has no disk cache and no decode sizing, so it re-downloads on every cold start — use TurboImage instead.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a View or Animated.View that only wraps an identical view when neither carries anything but a style; every extra host view is a real node in the native tree and costs layout and memory.",
    },
  },
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

// Every occurrence of the string counts, not only a listener argument: the
// event does not exist on Android wherever the name is written.
const noKeyboardWillEvents = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the iOS-only `keyboardWill*` event names; on Android the listener is registered and never fires, so whatever it drives silently does nothing on half the devices.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow calling a React state setter from a scroll handler prop; scroll fires every frame, so the whole screen re-renders every frame.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Require hoisting a non-component function that reads nothing from the component around it to module scope, where it is created once, keeps a stable identity and can be tested without rendering.",
    },
  },
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
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `useMemo`, `useCallback` and `memo` unless a `why:` comment on the line above states the case the React Compiler cannot see — something rendered per list row, or a cost that was measured.",
    },
  },
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
  meta: { name: "@ashstack/react-native" },
  rules: {
    "no-keyboard-will-events": noKeyboardWillEvents,
    "no-scroll-position-state": noScrollPositionState,
    "no-conditional-style-array": noConditionalStyleArray,
    "no-leaked-render": noLeakedRender,
    "no-rn-image-network-source": noRnImageNetworkSource,
    "no-redundant-view-nesting": noRedundantViewNesting,
    "no-rn-namespace-import": noRnNamespaceImport,
    "no-unlabeled-icon-pressable": noUnlabeledIconPressable,
    "hoist-stateless-function": hoistStatelessFunction,
    "no-manual-memo": noManualMemo,
  },
};
