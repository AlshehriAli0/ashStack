import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DESTRUCTURE_QUERY_HOOK =
  "Destructure this hook at the call site: `const { data } = useFooQuery()` rather than binding the whole result to one name.";

const API_HOOK_MODULE = /^@\/api\/.*\.(?:queries|mutations)$/;

export const requireDestructuredHooks: Rule = problem(
  "Reports a hook imported from an `@/api/*.queries` or `@/api/*.mutations` module whose result is bound to one name instead of destructured.",
  {
    createOnce(context: RuleContext) {
      const apiHooks = new Set<string>();
      const candidates: { node: AstNode; hook: string }[] = [];
      return {
        before() {
          apiHooks.clear();
          candidates.length = 0;
        },
        ImportDeclaration(node) {
          if (!API_HOOK_MODULE.test(node.source.value)) return;
          for (const specifier of node.specifiers) {
            if (specifier.type === "ImportSpecifier") apiHooks.add(specifier.local.name);
          }
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type !== "Identifier") return;
          if (init?.type !== "CallExpression") return;
          const { callee } = init;
          if (callee.type !== "Identifier" || !/^use[A-Z]/.test(callee.name)) return;
          candidates.push({ node: id, hook: callee.name });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!apiHooks.has(candidate.hook)) continue;
            context.report({ node: candidate.node, message: DESTRUCTURE_QUERY_HOOK });
          }
        },
      };
    },
  }
);
