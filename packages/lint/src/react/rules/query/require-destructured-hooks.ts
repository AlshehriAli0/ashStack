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
        ImportDeclaration(node: AstNode) {
          const source = (node.source as AstNode | undefined)?.value;
          if (typeof source !== "string" || !API_HOOK_MODULE.test(source)) return;
          for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
            const local = (specifier.local as AstNode | undefined)?.name as string | undefined;
            if (specifier.type === "ImportSpecifier" && local) apiHooks.add(local);
          }
        },
        VariableDeclarator(node: AstNode) {
          const id = node.id as AstNode | undefined;
          if (id?.type !== "Identifier") return;
          const init = node.init as AstNode | undefined;
          const callee = init?.callee as AstNode | undefined;
          if (init?.type !== "CallExpression" || callee?.type !== "Identifier") return;
          const name = callee.name as string;
          if (!/^use[A-Z]/.test(name)) return;
          candidates.push({ node, hook: name });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!apiHooks.has(candidate.hook)) continue;
            context.report({ node: candidate.node.id as AstNode, message: DESTRUCTURE_QUERY_HOOK });
          }
        },
      };
    },
  }
);
