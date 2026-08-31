// react-native-unistyles conventions.
//
// Two of these catch SILENT failures — a spread style and a raw hex both render
// fine and simply stop reacting to the theme. The rest keep styles on the
// theme's scale and inside StyleSheet.create, where Unistyles can recalculate
// them natively.
//
// Rules use createOnce so per-file state survives one traversal, and a before()
// text gate where a cheap marker can rule the file out. Gates fail OPEN — if the
// source text is unavailable the rule still runs, because a missed gate costs
// milliseconds and a wrong gate costs correctness.
import { calleeName, closestAncestor, findInSubtree, hasAncestor, subtreeHas } from "./internal/ast.js";

const LOGICAL_SPACING = new Set(["paddingLeft", "paddingRight", "marginLeft", "marginRight"]);

// Spacing and type scale only. Everything else a style holds numerically —
// flex, opacity, zIndex, borderWidth, aspectRatio — has no token and no reason
// for one. paddingLeft/paddingRight are excluded: in-sheet already rejects the
// physical direction, and the logical replacement lands back in this set.
const TOKEN_SPACING = new Set([
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "paddingVertical",
  "paddingStart",
  "paddingEnd",
  "margin",
  "marginTop",
  "marginBottom",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "gap",
  "rowGap",
  "columnGap",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "fontSize",
  "lineHeight",
]);

const LEGACY_SHADOW = new Set(["shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation"]);

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const ANY_MARGIN = /^margin(?:$|Top$|Bottom$|Left$|Right$|Start$|End$|Horizontal$|Vertical$)/;

const isNegation = current =>
  (current.type === "UnaryExpression" && current.operator === "-") ||
  (current.type === "Literal" && typeof current.value === "number" && current.value < 0);
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

const CREATE_MARKER = "StyleSheet.create";

const MESSAGES = {
  logicalSpacing: "Use paddingStart/paddingEnd or marginStart/marginEnd so directional spacing mirrors in RTL.",
  spacingToken:
    "Use theme.spacing[...] or theme.sizing.scale(...) for spacing of at least one point. The scale is what keeps rhythm consistent across screens and what makes a rhythm change one edit; if no token fits, add one to the theme.",
  rtlInSheet: "Use `rt.rtl` for RTL-dependent styles so Unistyles tracks the dependency natively.",
  screenDimensions: "Use reactive `rt.screen` inside StyleSheet.create instead of a Dimensions.get snapshot.",
  pixelRatio: "Use reactive `rt.pixelRatio` inside StyleSheet.create.",
  fontScale: "Use reactive `rt.fontScale` inside StyleSheet.create.",
  statusBar: "Use reactive `rt.statusBar.height` inside StyleSheet.create.",
  colorScheme: "Use the Unistyles theme or reactive `rt.colorScheme` inside StyleSheet.create.",
  fullRuntime:
    "Use the injected mini runtime (`rt`) instead of UnistylesRuntime inside StyleSheet.create so the style auto-recalculates.",
  fullRuntimeDestructure:
    "Destructure from the injected mini runtime (`rt`) inside StyleSheet.create, not UnistylesRuntime.",
  themeScreen:
    "Use reactive `rt.screen` (or Unistyles breakpoints) instead of the theme's module-initialization screen snapshot.",
  borderCurve:
    "Style objects with borderRadius must also set borderCurve, normally continuous. Without it the corner is a circular arc, not the squircle every native iOS control uses.",
  legacyShadow:
    'Legacy shadow*/elevation props split behavior across platforms. Use boxShadow (CSS syntax, both platforms on the New Architecture), e.g. boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)".',
  asConst:
    "`as const` is redundant inside StyleSheet.create — the typed create already narrows literals. If TS widens the value to string, fix the StyleSheet import instead.",
  rtlStyleCall: "Read `rt.rtl` inside the dynamic style instead of passing I18nManager.isRTL from JSX.",
  themeStyleAttr:
    "Resolve theme-dependent style values inside StyleSheet.create instead of reading theme in a JSX style prop or passing it to a dynamic style function.",
  themeScreenComponent:
    "Read current screen values from `useUnistyles().rt.screen` or useWindowDimensions instead of the theme's module-initialization snapshot.",
  animatedTheme:
    "Use `useAnimatedTheme()` and read its shared value inside the Reanimated worklet so theme changes reach the UI thread.",
  insetsStyleCall:
    "Read safe-area style values from `rt.insets` inside StyleSheet.create instead of passing useSafeAreaInsets() into a style function.",
  insetsAttribute:
    "Resolve inline safe-area style values through `rt.insets` in StyleSheet.create instead of a hook-fed JSX style object.",
  contentContainerRuntime:
    "A raw component does not subscribe contentContainerStyle to Unistyles updates. Use a hook-fed plain style or wrap the component with withUnistyles.",
  contentContainerTheme:
    "A raw component does not subscribe contentContainerStyle to theme changes. Use a hook-fed plain style or wrap the component with withUnistyles.",
  noMargin:
    "Use gap on the parent or padding on this element instead of margin. Margin escapes the child's own box, so it leaves stray space behind when the first or last child is removed and it collapses differently from the spacing scale. Negative margins are exempt: overlapping and half-size centering have no gap equivalent.",
  hardcodedColor:
    "Use a theme color token instead of a hardcoded color. A raw value bypasses dark mode and never shifts with the theme; if no token fits, add one to the theme.",
  styleSpread:
    "Never spread a style. Compose with an array — `[styles.a, styles.b]` — because spreading reads the object once and breaks the Unistyles C++ proxy, so the style silently stops reacting to the theme.",
};

const isStyleSheetCreate = node =>
  node !== null &&
  node !== undefined &&
  node.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "StyleSheet" &&
  node.callee.property?.name === "create";

const gate = (context, marker) => {
  const text = context.sourceCode?.getText?.();
  return text == null || text.includes(marker);
};

const propertyName = node => {
  const key = node.key;
  if (!key) return "";
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return "";
};

const memberPath = node => {
  const parts = [];
  let current = node;
  while (current?.type === "MemberExpression") {
    if (current.property?.type === "Identifier") parts.unshift(current.property.name);
    else if (current.property?.type === "Literal") parts.unshift(String(current.property.value));
    else parts.unshift("*");
    current = current.object;
  }
  if (current?.type === "Identifier") parts.unshift(current.name);
  return parts.join(".");
};

const tagOf = node => {
  const name = node.type === "JSXElement" ? node.openingElement?.name : node.name;
  let current = name;
  while (current?.type === "JSXMemberExpression") current = current.property;
  return current?.name ?? "";
};

// The object literal a create() call ultimately returns, through either form:
// create({...}), create(theme => ({...})), or create(theme => { return {...} }).
const stylesObjectOf = factory => {
  if (!factory) return null;
  if (factory.type === "ObjectExpression") return factory;
  if (factory.type === "ArrowFunctionExpression" || factory.type === "FunctionExpression") {
    const body = factory.body;
    if (body?.type === "ObjectExpression") return body;
    if (body?.type === "ParenthesizedExpression" && body.expression?.type === "ObjectExpression") {
      return body.expression;
    }
    return findInSubtree(body, current => current.type === "ObjectExpression");
  }
  return null;
};

// Depth tracking shared by the rules that only apply inside StyleSheet.create().
// Depth resets per file in before(), which also runs the text gate.
const inCreate = visit => ({
  meta: { type: "problem" },
  createOnce(context) {
    let depth = 0;
    const inside = () => depth > 0;
    const visitors = visit(context, inside);
    const enter = visitors.CallExpression;
    const exit = visitors["CallExpression:exit"];
    return {
      ...visitors,
      before() {
        depth = 0;
        return gate(context, CREATE_MARKER);
      },
      CallExpression(node) {
        if (isStyleSheetCreate(node)) depth += 1;
        enter?.(node);
      },
      "CallExpression:exit"(node) {
        exit?.(node);
        if (isStyleSheetCreate(node)) depth -= 1;
      },
    };
  },
});

const noMargin = inCreate((context, inside) => ({
  Property(node) {
    if (!inside()) return;
    const name = propertyName(node);
    if (name === "" || !ANY_MARGIN.test(name)) return;
    if (subtreeHas(node.value, isNegation)) return;
    context.report({ node, message: MESSAGES.noMargin });
  },
}));

const noHardcodedColor = inCreate((context, inside) => ({
  Literal(node) {
    if (!inside()) return;
    if (typeof node.value !== "string") return;
    if (!HEX_COLOR.test(node.value) && !CSS_COLOR_FUNCTION.test(node.value)) return;
    context.report({ node, message: MESSAGES.hardcodedColor });
  },
}));

const SIGNIFICANT_NUMBER = /^-?[1-9][0-9]*(?:\.[0-9]+)?$/;

const isThemeScaleHost = node =>
  hasAncestor(node, current => {
    if (current.type === "MemberExpression") {
      const path = memberPath(current);
      if (path.startsWith("theme.spacing") || path.startsWith("theme.sizing")) return true;
    }
    if (current.type === "CallExpression") {
      const path = current.callee?.type === "MemberExpression" ? memberPath(current.callee) : "";
      if (path === "theme.spacing.scale" || path === "theme.sizing.scale" || path === "theme.scale") return true;
    }
    return false;
  });

const isTokenDerived = node =>
  subtreeHas(node, current => {
    if (current.type === "MemberExpression") {
      const path = memberPath(current);
      return path.startsWith("theme.spacing") || path.startsWith("theme.sizing");
    }
    if (current.type === "CallExpression" && current.callee?.type === "MemberExpression") {
      const path = memberPath(current.callee);
      return path === "theme.spacing.scale" || path === "theme.sizing.scale" || path === "theme.scale";
    }
    return false;
  });

const noHardcodedSpacing = inCreate((context, inside) => ({
  Property(node) {
    if (!inside()) return;
    const name = propertyName(node);
    if (!TOKEN_SPACING.has(name)) return;
    if (isTokenDerived(node.value)) return;
    const rawNumber = findInSubtree(
      node.value,
      current =>
        (current.type === "Literal" &&
          typeof current.value === "number" &&
          SIGNIFICANT_NUMBER.test(String(current.value)) &&
          !isThemeScaleHost(current)) ||
        (current.type === "UnaryExpression" &&
          current.operator === "-" &&
          current.argument?.type === "Literal" &&
          typeof current.argument.value === "number" &&
          SIGNIFICANT_NUMBER.test(`-${current.argument.value}`) &&
          !isThemeScaleHost(current))
    );
    if (rawNumber) context.report({ node: rawNumber, message: MESSAGES.spacingToken });
  },
}));

const inSheet = inCreate((context, inside) => ({
  CallExpression(node) {
    if (!inside() || isStyleSheetCreate(node)) return;
    const path = node.callee?.type === "MemberExpression" ? memberPath(node.callee) : calleeName(node);
    if (path === "Dimensions.get") context.report({ node, message: MESSAGES.screenDimensions });
    else if (path === "PixelRatio.get") context.report({ node, message: MESSAGES.pixelRatio });
    else if (path === "PixelRatio.getFontScale") context.report({ node, message: MESSAGES.fontScale });
    else if (path === "Appearance.getColorScheme") context.report({ node, message: MESSAGES.colorScheme });
    else if (path === "useColorScheme") context.report({ node, message: MESSAGES.colorScheme });
  },
  MemberExpression(node) {
    if (!inside()) return;
    if (node.parent?.type === "MemberExpression" && node.parent.object === node) return;
    const path = memberPath(node);
    if (path === "I18nManager.isRTL") {
      context.report({ node, message: MESSAGES.rtlInSheet });
      return;
    }
    if (path === "StatusBar.currentHeight") {
      context.report({ node, message: MESSAGES.statusBar });
      return;
    }
    if (path.startsWith("UnistylesRuntime.")) {
      context.report({ node, message: MESSAGES.fullRuntime });
      return;
    }
    if (/^theme\.screen\./.test(path)) context.report({ node, message: MESSAGES.themeScreen });
  },
  VariableDeclarator(node) {
    if (!inside()) return;
    if (node.id?.type !== "ObjectPattern") return;
    if (node.init?.type === "Identifier" && node.init.name === "UnistylesRuntime") {
      context.report({ node, message: MESSAGES.fullRuntimeDestructure });
    }
  },
  TSAsExpression(node) {
    if (!inside()) return;
    const annotation = node.typeAnnotation;
    if (annotation?.type !== "TSTypeReference") return;
    if (annotation.typeName?.name !== "const") return;
    context.report({ node, message: MESSAGES.asConst });
  },
  ObjectExpression(node) {
    if (!inside()) return;
    let borderRadius = null;
    let hasBorderCurve = false;
    for (const property of node.properties ?? []) {
      if (property.type !== "Property") continue;
      const name = propertyName(property);
      if (name === "borderRadius") borderRadius = property;
      else if (name === "borderCurve") hasBorderCurve = true;
    }
    if (borderRadius && !hasBorderCurve) context.report({ node: borderRadius, message: MESSAGES.borderCurve });
  },
  Property(node) {
    if (!inside()) return;
    const name = propertyName(node);
    if (LEGACY_SHADOW.has(name)) {
      context.report({ node, message: MESSAGES.legacyShadow });
      return;
    }
    if (!LOGICAL_SPACING.has(name)) return;
    const usesInsets = subtreeHas(node, current => {
      if (current.type !== "MemberExpression") return false;
      const path = memberPath(current);
      return path === "rt.insets.left" || path === "rt.insets.right";
    });
    if (!usesInsets) context.report({ node, message: MESSAGES.logicalSpacing });
  },
}));

const declaresUseUnistylesTheme = scope =>
  subtreeHas(
    scope,
    current =>
      current.type === "VariableDeclarator" &&
      current.id?.type === "ObjectPattern" &&
      calleeName(current.init) === "useUnistyles" &&
      (current.id.properties ?? []).some(property => property.key?.name === "theme")
  );

const readsTheme = node =>
  subtreeHas(node, current => current.type === "MemberExpression" && memberPath(current).startsWith("theme."));

const rtlStyleCall = {
  meta: { type: "problem" },
  createOnce(context) {
    const sheets = new Set();
    const candidates = [];
    return {
      before() {
        sheets.clear();
        candidates.length = 0;
        return gate(context, CREATE_MARKER);
      },
      VariableDeclarator(node) {
        if (node.id?.type === "Identifier" && isStyleSheetCreate(node.init)) sheets.add(node.id.name);
      },
      MemberExpression(node) {
        if (memberPath(node) !== "I18nManager.isRTL") return;
        const call = closestAncestor(node, new Set(["CallExpression"]));
        if (!call || call.callee?.type !== "MemberExpression") return;
        const receiver = call.callee.object;
        if (receiver?.type !== "Identifier") return;
        candidates.push({ call, receiver: receiver.name });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!sheets.has(candidate.receiver)) continue;
          context.report({ node: candidate.call, message: MESSAGES.rtlStyleCall });
        }
      },
    };
  },
};

const themeStyleAttr = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "style") return;
        if (!readsTheme(node)) return;
        const component = closestAncestor(node, FUNCTION_TYPES);
        if (!component || !declaresUseUnistylesTheme(component)) return;
        context.report({ node, message: MESSAGES.themeStyleAttr });
      },
    };
  },
};

const themeScreenComponent = {
  meta: { type: "problem" },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (!/^theme\.screen\./.test(memberPath(node))) return;
        if (node.parent?.type === "MemberExpression" && node.parent.object === node) return;
        if (hasAncestor(node, isStyleSheetCreate)) return;
        const component = closestAncestor(node, new Set(["FunctionDeclaration"]));
        if (!component || !declaresUseUnistylesTheme(component)) return;
        context.report({ node, message: MESSAGES.themeScreenComponent });
      },
    };
  },
};

const WORKLET_HOOKS = new Set(["useAnimatedStyle", "useDerivedValue", "useAnimatedProps"]);

const animatedTheme = {
  meta: { type: "problem" },
  createOnce(context) {
    let declaresTheme = false;
    const candidates = [];
    return {
      before() {
        declaresTheme = false;
        candidates.length = 0;
      },
      VariableDeclarator(node) {
        if (
          node.id?.type === "ObjectPattern" &&
          calleeName(node.init) === "useUnistyles" &&
          (node.id.properties ?? []).some(property => property.key?.name === "theme")
        ) {
          declaresTheme = true;
        }
      },
      CallExpression(node) {
        if (!WORKLET_HOOKS.has(calleeName(node))) return;
        if (!readsTheme(node)) return;
        candidates.push(node);
      },
      "Program:exit"() {
        if (!declaresTheme) return;
        for (const node of candidates) context.report({ node, message: MESSAGES.animatedTheme });
      },
    };
  },
};

const INSET_TEXT = /(?:inset|safearea|top|bottom|left|right)/i;

const insets = {
  meta: { type: "problem" },
  createOnce(context) {
    const bindings = new Set();
    const sheets = new Set();
    const styleCalls = [];
    const styleAttributes = [];
    const source = () => context.sourceCode ?? context.getSourceCode();
    return {
      before() {
        bindings.clear();
        sheets.clear();
        styleCalls.length = 0;
        styleAttributes.length = 0;
        return gate(context, "useSafeAreaInsets");
      },
      VariableDeclarator(node) {
        if (node.id?.type === "Identifier" && isStyleSheetCreate(node.init)) {
          sheets.add(node.id.name);
          return;
        }
        if (calleeName(node.init) !== "useSafeAreaInsets") return;
        if (node.id?.type === "Identifier") bindings.add(node.id.name);
        else if (node.id?.type === "ObjectPattern") {
          for (const property of node.id.properties ?? []) {
            if (property.value?.type === "Identifier") bindings.add(property.value.name);
            else if (property.key?.type === "Identifier") bindings.add(property.key.name);
          }
        }
      },
      CallExpression(node) {
        if (node.callee?.type !== "MemberExpression") return;
        const receiver = node.callee.object;
        if (receiver?.type !== "Identifier") return;
        const exempt = closestAncestor(node, new Set(["JSXAttribute"]));
        if (exempt?.name?.name === "contentContainerStyle") return;
        styleCalls.push({ node, receiver: receiver.name });
      },
      JSXAttribute(node) {
        if (node.name?.name !== "style") return;
        styleAttributes.push(node);
      },
      "Program:exit"() {
        const referencesBinding = node =>
          subtreeHas(node, current => current.type === "Identifier" && bindings.has(current.name));
        for (const entry of styleCalls) {
          if (!sheets.has(entry.receiver)) continue;
          const text = source().getText(entry.node);
          if (!INSET_TEXT.test(text)) continue;
          if (!referencesBinding(entry.node)) continue;
          context.report({ node: entry.node, message: MESSAGES.insetsStyleCall });
        }
        for (const attribute of styleAttributes) {
          const text = source().getText(attribute);
          if (!INSET_TEXT.test(text)) continue;
          const usesInsetsMember = subtreeHas(
            attribute,
            current =>
              current.type === "MemberExpression" &&
              current.object?.type === "Identifier" &&
              bindings.has(current.object.name)
          );
          if (!usesInsetsMember) continue;
          context.report({ node: attribute, message: MESSAGES.insetsAttribute });
        }
      },
    };
  },
};

const contentContainer = {
  meta: { type: "problem" },
  createOnce(context) {
    const sheetStyles = new Map();
    const wrapped = new Set();
    const attributes = [];
    return {
      before() {
        sheetStyles.clear();
        wrapped.clear();
        attributes.length = 0;
        return gate(context, "contentContainerStyle");
      },
      VariableDeclarator(node) {
        if (node.id?.type !== "Identifier") return;
        if (calleeName(node.init) === "withUnistyles") {
          wrapped.add(node.id.name);
          return;
        }
        if (!isStyleSheetCreate(node.init)) return;
        const styles = stylesObjectOf(node.init.arguments?.[0]);
        if (!styles) return;
        const map = new Map();
        for (const property of styles.properties ?? []) {
          if (property.type !== "Property") continue;
          map.set(propertyName(property), property.value);
        }
        sheetStyles.set(node.id.name, map);
      },
      JSXAttribute(node) {
        if (node.name?.name !== "contentContainerStyle") return;
        attributes.push(node);
      },
      "Program:exit"() {
        for (const attribute of attributes) {
          const reference = findInSubtree(
            attribute.value,
            current =>
              current.type === "MemberExpression" &&
              current.object?.type === "Identifier" &&
              sheetStyles.has(current.object.name)
          );
          if (!reference) continue;
          const owner = attribute.parent;
          if (owner?.type === "JSXOpeningElement" && wrapped.has(tagOf(owner))) continue;
          const definition = sheetStyles
            .get(reference.object.name)
            ?.get(reference.property?.type === "Identifier" ? reference.property.name : "");
          if (!definition) continue;
          const usesRuntime = subtreeHas(
            definition,
            current => current.type === "MemberExpression" && memberPath(current).startsWith("rt.")
          );
          if (usesRuntime) {
            context.report({ node: attribute, message: MESSAGES.contentContainerRuntime });
            continue;
          }
          const usesTheme = subtreeHas(
            definition,
            current => current.type === "MemberExpression" && memberPath(current).startsWith("theme.")
          );
          if (usesTheme) context.report({ node: attribute, message: MESSAGES.contentContainerTheme });
        }
      },
    };
  },
};

// Cross-traversal state: collect every sheet's keys and every `sheet.key` read,
// then report at the end. Anything that could hide a use — a computed key, a
// computed read, or the sheet escaping the module — bails the whole file.
const noUnusedStyles = {
  meta: { type: "problem" },
  createOnce(context) {
    let sheets = new Map();
    let reads = new Set();
    let bail = false;
    return {
      before() {
        sheets = new Map();
        reads = new Set();
        bail = false;
        return gate(context, CREATE_MARKER);
      },
      CallExpression(node) {
        if (!isStyleSheetCreate(node)) return;
        const declarator = node.parent?.type === "VariableDeclarator" ? node.parent : null;
        if (declarator?.id?.type !== "Identifier") {
          bail = true;
          return;
        }
        const styles = stylesObjectOf(node.arguments?.[0]);
        if (!styles) {
          bail = true;
          return;
        }
        const keys = new Map();
        for (const property of styles.properties ?? []) {
          if (property.type !== "Property" || property.computed) {
            bail = true;
            continue;
          }
          const name = propertyName(property);
          if (name === "") bail = true;
          else keys.set(name, property.key);
        }
        sheets.set(declarator.id.name, keys);
      },
      MemberExpression(node) {
        if (node.object?.type !== "Identifier") return;
        if (node.computed) {
          reads.add(`${node.object.name}.*`);
          return;
        }
        if (node.property?.type === "Identifier") reads.add(`${node.object.name}.${node.property.name}`);
      },
      // A stylesheet reaching another module cannot be checked from here.
      ExportNamedDeclaration(node) {
        for (const declaration of node.declaration?.declarations ?? []) {
          if (declaration.id?.type === "Identifier") reads.add(`${declaration.id.name}.*`);
        }
        for (const specifier of node.specifiers ?? []) {
          if (specifier.local?.type === "Identifier") reads.add(`${specifier.local.name}.*`);
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration?.type === "Identifier") reads.add(`${node.declaration.name}.*`);
      },
      "Program:exit"() {
        if (bail) return;
        for (const [sheet, keys] of sheets) {
          if (reads.has(`${sheet}.*`)) continue;
          for (const [name, keyNode] of keys) {
            if (reads.has(`${sheet}.${name}`)) continue;
            context.report({
              node: keyNode,
              message: `\`${sheet}.${name}\` is never used. Delete it — an unused style is dead weight the next reader has to rule out, and it keeps a token alive that nothing renders.`,
            });
          }
        }
      },
    };
  },
};

const spreadBase = node => {
  let current = node;
  while (current?.type === "MemberExpression") current = current.object;
  return current?.type === "Identifier" ? current.name : "";
};

const noStyleSpread = {
  meta: { type: "problem" },
  createOnce(context) {
    const sheets = new Set();
    const candidates = [];
    return {
      before() {
        sheets.clear();
        candidates.length = 0;
        return gate(context, "...");
      },
      VariableDeclarator(node) {
        if (node.id?.type === "Identifier" && isStyleSheetCreate(node.init)) sheets.add(node.id.name);
      },
      SpreadElement(node) {
        const base = spreadBase(node.argument);
        if (base !== "") candidates.push({ node, base });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!sheets.has(candidate.base) && !/[Ss]tyles$/.test(candidate.base)) continue;
          context.report({ node: candidate.node, message: MESSAGES.styleSpread });
        }
      },
    };
  },
};

export default {
  meta: { name: "unistyles" },
  rules: {
    "animated-theme": animatedTheme,
    "content-container": contentContainer,
    "in-sheet": inSheet,
    insets: insets,
    "no-hardcoded-color": noHardcodedColor,
    "no-hardcoded-spacing": noHardcodedSpacing,
    "no-margin": noMargin,
    "no-style-spread": noStyleSpread,
    "no-unused-styles": noUnusedStyles,
    "rtl-style-call": rtlStyleCall,
    "theme-screen-component": themeScreenComponent,
    "theme-style-attr": themeStyleAttr,
  },
};
