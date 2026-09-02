import { gate, importedNames, problem, propertyValue } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ROUTER_MODULE } from "./shared.js";

const BROAD_HOOKS = new Set(["useLocation", "useRouterState"]);

const MESSAGES = {
  whole:
    "This hook subscribes to the whole router value, so the component re-renders on every navigation. Pass a `select` that returns what it reads, e.g. `{ select: location => location.pathname }`.",
  noSelect:
    "This hook subscribes to the whole router value, so the component re-renders on every navigation. Add a `select` returning the smallest value it reads.",
  search:
    "`useSearch({ strict: false })` subscribes to every route-search change. Add a `select` returning the keys this component reads.",
};

const hasSelect = (options: AstNode | undefined): boolean => propertyValue(options, "select") !== null;

/** `strict: false` on the hook's own options object, not on some object nested inside it. */
const isNonStrict = (options: AstNode | undefined): boolean => {
  const strict = propertyValue(options, "strict");
  return strict?.type === "Literal" && strict.value === false;
};

export const requireSelector: Rule = problem(
  "Require a `select` on `useLocation`, `useRouterState` and non-strict `useSearch`, so a component reads the smallest router value it needs instead of re-rendering on every navigation.",
  {
    createOnce(context: RuleContext) {
      const broad = new Set<string>();
      const search = new Set<string>();
      const calls: { node: AstNode; name: string; options: AstNode | undefined }[] = [];

      return {
        before() {
          broad.clear();
          search.clear();
          calls.length = 0;
          return gate(context, ROUTER_MODULE);
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedNames(node, ROUTER_MODULE)) {
            if (BROAD_HOOKS.has(imported)) broad.add(local);
            else if (imported === "useSearch") search.add(local);
          }
        },
        CallExpression(node) {
          if (node.callee.type === "Identifier")
            calls.push({ node, name: node.callee.name, options: node.arguments[0] });
        },
        "Program:exit"() {
          for (const { node, name, options } of calls) {
            if (broad.has(name)) {
              if (!options) context.report({ node, message: MESSAGES.whole });
              else if (!hasSelect(options)) context.report({ node, message: MESSAGES.noSelect });
              continue;
            }

            if (!search.has(name) || !isNonStrict(options)) continue;
            if (!hasSelect(options)) context.report({ node, message: MESSAGES.search });
          }
        },
      };
    },
  }
);
