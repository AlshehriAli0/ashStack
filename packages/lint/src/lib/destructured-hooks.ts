import { problem } from "./ast.js";
import type { AstNode, Rule, RuleContext } from "./types.js";

type Import = Extract<AstNode, { type: "ImportDeclaration" }>;

/**
 * A rule asking for the result of some imported hooks to be destructured at
 * the call site, `const { push } = useRouter()` rather than `const router =
 * useRouter()`, so the React Compiler caches on what is called instead of the
 * whole object. `hooksIn` names the hooks one import brings in, by local name.
 */
export const requireDestructured = (
  description: string,
  hooksIn: (node: Import) => Iterable<string>,
  message: (hook: string) => string
): Rule =>
  problem(description, {
    createOnce(context: RuleContext) {
      const hooks = new Set<string>();
      const candidates: { node: AstNode; hook: string }[] = [];
      return {
        before() {
          hooks.clear();
          candidates.length = 0;
        },
        ImportDeclaration(node) {
          for (const hook of hooksIn(node)) hooks.add(hook);
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type !== "Identifier" || init?.type !== "CallExpression") return;
          const { callee } = init;
          if (callee.type !== "Identifier" || !/^use[A-Z]/.test(callee.name)) return;
          candidates.push({ node: id, hook: callee.name });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (hooks.has(candidate.hook)) context.report({ node: candidate.node, message: message(candidate.hook) });
          }
        },
      };
    },
  });
