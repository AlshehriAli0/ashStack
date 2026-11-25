import { importedNames } from "../../../lib/ast.js";
import { requireDestructured } from "../../../lib/destructured-hooks.js";
import type { Rule } from "../../../lib/types.js";

const ROUTER_HOOKS: Record<string, ReadonlySet<string>> = {
  "expo-router": new Set(["useRouter", "useNavigation"]),
  "@react-navigation/native": new Set(["useNavigation"]),
};

export const requireDestructuredRouter: Rule = requireDestructured(
  "Require destructuring the result of `useRouter` and `useNavigation` at the call site. A method called on the whole object makes the React Compiler cache on that object instead of on the function.",
  node =>
    importedNames(node, node.source.value).flatMap(({ imported, local }) =>
      ROUTER_HOOKS[node.source.value]?.has(imported) ? [local] : []
    ),
  hook =>
    `Destructure the methods you call from \`${hook}()\`, as in \`const { push } = ${hook}()\`. Called on the whole object, the React Compiler caches on the object instead of on the function.`
);
