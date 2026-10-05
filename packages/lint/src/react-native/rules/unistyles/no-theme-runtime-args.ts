import { problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, RuleContext } from "../../../lib/types.js";

type Origin =
  | "hook"
  | "runtime"
  | "sheet"
  | "namespace"
  | "create"
  | "Dimensions"
  | "PixelRatio"
  | "Appearance"
  | "I18nManager"
  | "StatusBar";

const IMPORT_ORIGINS = new Map<string, Map<string, Origin>>([
  [
    "react-native-unistyles",
    new Map([
      ["useUnistyles", "hook"],
      ["UnistylesRuntime", "runtime"],
      ["StyleSheet", "create"],
    ]),
  ],
  [
    "react-native",
    new Map([
      ["useWindowDimensions", "hook"],
      ["useColorScheme", "hook"],
      ["Dimensions", "Dimensions"],
      ["PixelRatio", "PixelRatio"],
      ["Appearance", "Appearance"],
      ["I18nManager", "I18nManager"],
      ["StatusBar", "StatusBar"],
    ]),
  ],
  [
    "react-native-safe-area-context",
    new Map([
      ["useSafeAreaInsets", "hook"],
      ["useSafeAreaFrame", "hook"],
    ]),
  ],
]);
const MEMBER_ORIGINS = new Map<Origin, Map<string, Origin>>([
  ["namespace", IMPORT_ORIGINS.get("react-native-unistyles") ?? new Map()],
  ["Dimensions", new Map([["get", "hook"]])],
  [
    "PixelRatio",
    new Map([
      ["get", "hook"],
      ["getFontScale", "hook"],
    ]),
  ],
  ["Appearance", new Map([["getColorScheme", "hook"]])],
  ["I18nManager", new Map([["isRTL", "runtime"]])],
  ["StatusBar", new Map([["currentHeight", "runtime"]])],
]);
type Scope = ReturnType<RuleContext["sourceCode"]["getScope"]>;
type Variable = Scope["variables"][number];

const bindingOf = (context: RuleContext, node: AstNode): Variable | undefined => {
  if (node.type !== "Identifier") return undefined;
  for (let scope: Scope | null = context.sourceCode.getScope(node); scope; scope = scope.upper) {
    const binding = scope.set.get(node.name);
    if (binding) return binding;
  }
  return undefined;
};

const memberName = (node: AstNode): string => {
  if (node.type !== "MemberExpression") return "";
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  return node.property.type === "Literal" ? String(node.property.value) : "";
};

const importedOrigin = (node: AstNode): Origin | undefined => {
  if (node.parent?.type !== "ImportDeclaration") return undefined;
  const source = node.parent.source.value;
  if (node.type === "ImportNamespaceSpecifier" && source === "react-native-unistyles") return "namespace";
  if (node.type !== "ImportSpecifier" || node.imported.type !== "Identifier") return undefined;
  return IMPORT_ORIGINS.get(source)?.get(node.imported.name);
};

const bindingOrigin = (context: RuleContext, node: AstNode, seen: Set<Variable>): Origin | undefined => {
  const binding = bindingOf(context, node);
  if (!binding || seen.has(binding)) return undefined;
  const nextSeen = new Set(seen).add(binding);
  for (const definition of binding.defs) {
    if (definition.type === "ImportBinding") return importedOrigin(definition.node);
    if (definition.node.type === "VariableDeclarator") return originOf(context, definition.node.init, nextSeen);
  }
  return undefined;
};

const callOrigin = (origin: Origin | undefined, callee: AstNode): Origin | undefined => {
  if (origin === "hook") return "runtime";
  if (origin === "create" && memberName(callee) === "create") return "sheet";
  return undefined;
};

const originOf = (context: RuleContext, node: AstNode | null, seen = new Set<Variable>()): Origin | undefined => {
  if (!node) return undefined;
  if (node.type === "Identifier") return bindingOrigin(context, node, seen);
  if (node.type === "MemberExpression") {
    const origin = originOf(context, node.object, seen);
    if (!origin) return undefined;
    const members = MEMBER_ORIGINS.get(origin);
    return members ? members.get(memberName(node)) : origin;
  }
  if (node.type === "CallExpression") {
    return callOrigin(originOf(context, node.callee, seen), node.callee);
  }
  const isTypeWrapper =
    node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression";
  if (isTypeWrapper || node.type === "ChainExpression") return originOf(context, node.expression, seen);
  return undefined;
};

const isReference = (node: AstNode): boolean => {
  const parent = node.parent;
  if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return false;
  return !(parent?.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand);
};

const readsRuntime = (context: RuleContext, node: AstNode, seen = new Set<Variable>()): boolean =>
  subtreeHas(node, current => {
    if (current.type === "MemberExpression" || current.type === "CallExpression") {
      return originOf(context, current) === "runtime";
    }
    if (current.type !== "Identifier" || !isReference(current)) return false;
    if (originOf(context, current) === "runtime") return true;
    const binding = bindingOf(context, current);
    if (!binding || seen.has(binding)) return false;
    const nextSeen = new Set(seen).add(binding);
    return binding.defs.some(
      definition =>
        definition.node.type === "VariableDeclarator" &&
        definition.node.init !== null &&
        readsRuntime(context, definition.node.init, nextSeen)
    );
  }) || originOf(context, node) === "runtime";

export const noThemeRuntimeArgs = problem(
  "Disallow passing theme or Unistyles runtime values into dynamic style functions, including screen dimensions, safe-area insets, RTL, pixel/font scale, color scheme, derived values and aliases. Read `theme` and `rt` inside the `StyleSheet.create` callback instead.",
  {
    createOnce(context) {
      return {
        CallExpression(node) {
          if (node.callee.type !== "MemberExpression") return;
          if (originOf(context, node.callee.object) !== "sheet") return;
          for (const argument of node.arguments) {
            if (!readsRuntime(context, argument)) continue;
            context.report({
              node: argument,
              message:
                "Read `theme` and `rt` inside `StyleSheet.create` instead of passing them into a style function.",
            });
          }
        },
      };
    },
  }
);
