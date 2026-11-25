import { requireDestructured } from "../../../lib/destructured-hooks.js";
import type { Rule } from "../../../lib/types.js";

const DESTRUCTURE_QUERY_HOOK = "Destructure this hook at the call site: `const { data } = useFooQuery()`.";

const API_HOOK_MODULE = /^@\/api\/.*\.(?:queries|mutations)$/;

export const requireDestructuredHooks: Rule = requireDestructured(
  "Require destructuring the result of a hook imported from an `@/api/*.queries` or `@/api/*.mutations` module.",
  node =>
    API_HOOK_MODULE.test(node.source.value)
      ? node.specifiers.flatMap(specifier => (specifier.type === "ImportSpecifier" ? [specifier.local.name] : []))
      : [],
  () => DESTRUCTURE_QUERY_HOOK
);
