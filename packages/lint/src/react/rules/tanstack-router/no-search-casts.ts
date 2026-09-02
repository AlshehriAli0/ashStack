import { findInSubtree, memberPathOf, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ROUTER_MODULE, importedAs } from "./shared.js";

const ROUTER_STATE_SEARCH = "state.location.search";

const MESSAGES = {
  search:
    "Drop this assertion and let the route's `validateSearch` schema type the result. An `as` here claims a shape the URL never has to honour; widen the schema, or parse the value, if the type is wrong.",
  routerState:
    "Drop this assertion and read validated search through `useSearch({ from: ... })`. `router.state.location.search` is whatever the URL held, so an `as` here is a claim about a string nobody checked.",
};

const unwrapAssertions = (node: AstNode): AstNode => {
  let inner = node;
  while (inner.type === "TSAsExpression") inner = inner.expression;
  return inner;
};

const callsOneOf = (node: AstNode, names: ReadonlySet<string>): boolean =>
  findInSubtree(
    node,
    current =>
      current.type === "CallExpression" && current.callee.type === "Identifier" && names.has(current.callee.name)
  ) !== null;

export const noSearchCasts: Rule = problem(
  "Disallow an `as` assertion on a `useSearch()` result or on `router.state.location.search`. The route's `validateSearch` schema is what supplies the type.",
  {
    createOnce(context: RuleContext) {
      const search = new Set<string>();
      const routers = new Set<string>();
      const routerBindings = new Set<string>();
      const assertions: { node: AstNode; inner: AstNode }[] = [];

      return {
        before() {
          search.clear();
          routers.clear();
          routerBindings.clear();
          assertions.length = 0;
          return context.sourceCode.text.includes(ROUTER_MODULE);
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedAs(node)) {
            if (imported === "useSearch") search.add(local);
            else if (imported === "useRouter") routers.add(local);
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return;
          if (callsOneOf(node.init, routers)) routerBindings.add(node.id.name);
        },
        /** `x as unknown as T` nests two of these over one expression; the outer one is the report. */
        TSAsExpression(node) {
          if (node.parent.type === "TSAsExpression") return;
          assertions.push({ node, inner: unwrapAssertions(node.expression) });
        },
        "Program:exit"() {
          for (const { node, inner } of assertions) {
            if (
              inner.type === "CallExpression" &&
              inner.callee.type === "Identifier" &&
              search.has(inner.callee.name)
            ) {
              context.report({ node, message: MESSAGES.search });
              continue;
            }

            const path = memberPathOf(inner);
            if (!path.endsWith(ROUTER_STATE_SEARCH)) continue;
            const root = path.split(".")[0] ?? "";
            if (routerBindings.has(root) || callsOneOf(inner, routers)) {
              context.report({ node, message: MESSAGES.routerState });
            }
          }
        },
      };
    },
  }
);
