import { gate, problem, subtreeHas } from "../../../lib/ast.js";
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

const UNISTYLES_IMPORTS = new Map<string, Origin>([
  ["useUnistyles", "hook"],
  ["UnistylesRuntime", "runtime"],
  ["StyleSheet", "create"],
]);
const IMPORT_ORIGINS = new Map<string, Map<string, Origin>>([
  ["react-native-unistyles", UNISTYLES_IMPORTS],
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
  ["namespace", UNISTYLES_IMPORTS],
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

const callOrigin = (origin: Origin | undefined, callee: AstNode): Origin | undefined => {
  if (origin === "hook") return "runtime";
  if (origin === "create" && memberName(callee) === "create") return "sheet";
  return undefined;
};

const isReference = (node: AstNode): boolean => {
  const parent = node.parent;
  if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return false;
  return !(parent?.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand);
};

const createChecks = (context: RuleContext) => {
  const origins = new WeakMap<AstNode, Origin | undefined>();
  const resolving = new Set<Variable>();
  const scanning = new Set<Variable>();

  const bindingOrigin = (node: AstNode): Origin | undefined => {
    const binding = bindingOf(context, node);
    if (!binding || resolving.has(binding)) return undefined;
    resolving.add(binding);
    const definition = binding.defs.find(def => def.type === "ImportBinding" || def.node.type === "VariableDeclarator");
    let origin: Origin | undefined;
    if (definition?.type === "ImportBinding") origin = importedOrigin(definition.node);
    else if (definition?.node.type === "VariableDeclarator") origin = originOf(definition.node.init);
    resolving.delete(binding);
    return origin;
  };

  const resolveOrigin = (node: AstNode | null): Origin | undefined => {
    if (!node) return undefined;
    if (node.type === "Identifier") return bindingOrigin(node);
    if (node.type === "MemberExpression") {
      const origin = originOf(node.object);
      if (!origin) return undefined;
      const members = MEMBER_ORIGINS.get(origin);
      return members ? members.get(memberName(node)) : origin;
    }
    if (node.type === "CallExpression") {
      return callOrigin(originOf(node.callee), node.callee);
    }
    const isTypeWrapper =
      node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression";
    if (isTypeWrapper || node.type === "ChainExpression") return originOf(node.expression);
    return undefined;
  };

  const originOf = (node: AstNode | null): Origin | undefined => {
    if (!node) return undefined;
    if (origins.has(node)) return origins.get(node);
    const origin = resolveOrigin(node);
    origins.set(node, origin);
    return origin;
  };

  const readsRuntime = (node: AstNode): boolean =>
    subtreeHas(node, current => {
      if (current.type === "MemberExpression" || current.type === "CallExpression") {
        return originOf(current) === "runtime";
      }
      if (current.type !== "Identifier" || !isReference(current)) return false;
      if (originOf(current) === "runtime") return true;
      const binding = bindingOf(context, current);
      if (!binding || scanning.has(binding)) return false;
      scanning.add(binding);
      const reads = binding.defs.some(
        definition =>
          definition.node.type === "VariableDeclarator" &&
          definition.node.init !== null &&
          readsRuntime(definition.node.init)
      );
      scanning.delete(binding);
      return reads;
    });

  return { originOf, readsRuntime };
};

export const noThemeRuntimeArgs = problem(
  "Disallow passing theme or Unistyles runtime values into dynamic style functions, including screen dimensions, safe-area insets, RTL, pixel/font scale, color scheme, derived values and aliases. Read `theme` and `rt` inside the `StyleSheet.create` callback instead.",
  {
    createOnce(context) {
      let checks: ReturnType<typeof createChecks>;
      return {
        before() {
          if (!gate(context, "react-native-unistyles")) return false;
          checks = createChecks(context);
          return true;
        },
        CallExpression(node) {
          if (node.arguments.length === 0 || node.callee.type !== "MemberExpression") return;
          if (checks.originOf(node.callee.object) !== "sheet") return;
          for (const argument of node.arguments) {
            if (!checks.readsRuntime(argument)) continue;
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
