import { gate, importedNames, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ROUTER_MODULE } from "./shared.js";

/** `router.state.location.search`, walked innermost-out from the `search` end. */
const SEARCH_PATH = ["search", "location", "state"];

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

/** The name of a bare `foo()` call; `""` for a method call or anything that is not a call. */
const bareCallName = (node: AstNode | null | undefined): string =>
  node?.type === "CallExpression" && node.callee.type === "Identifier" ? node.callee.name : "";

/** One step of a member chain: `a.search` and `a["search"]` both read as `search`. */
const segmentName = (node: AstNode): string => {
  if (node.type !== "MemberExpression") return "";
  const { property } = node;
  if (property.type === "Identifier") return node.computed ? "" : property.name;
  return property.type === "Literal" ? String(property.value) : "";
};

/** Whatever `.state.location.search` hangs off, or `null` when the chain is not that. */
const searchReceiver = (node: AstNode): AstNode | null => {
  let current = node;
  for (const segment of SEARCH_PATH) {
    if (current.type !== "MemberExpression" || segmentName(current) !== segment) return null;
    current = current.object;
  }
  return current;
};

export const noSearchCasts: Rule = problem(
  "Disallow an `as` assertion on a `useSearch()` result or on `router.state.location.search`. The route's `validateSearch` schema is what supplies the type.",
  {
    createOnce(context: RuleContext) {
      const search = new Set<string>();
      const routers = new Set<string>();
      const routerBindings = new Set<string>();
      const assertions: { node: AstNode; inner: AstNode }[] = [];

      const isRouter = (receiver: AstNode): boolean =>
        receiver.type === "Identifier" ? routerBindings.has(receiver.name) : routers.has(bareCallName(receiver));

      return {
        before() {
          search.clear();
          routers.clear();
          routerBindings.clear();
          assertions.length = 0;
          return gate(context, ROUTER_MODULE);
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedNames(node, ROUTER_MODULE)) {
            if (imported === "useSearch") search.add(local);
            else if (imported === "useRouter") routers.add(local);
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier") return;
          if (routers.has(bareCallName(node.init))) routerBindings.add(node.id.name);
        },
        /** `x as unknown as T` nests two of these over one expression; the outer one is the report. */
        TSAsExpression(node) {
          if (node.parent.type === "TSAsExpression") return;
          assertions.push({ node, inner: unwrapAssertions(node.expression) });
        },
        "Program:exit"() {
          for (const { node, inner } of assertions) {
            if (search.has(bareCallName(inner))) {
              context.report({ node, message: MESSAGES.search });
              continue;
            }

            const receiver = searchReceiver(inner);
            if (receiver && isRouter(receiver)) context.report({ node, message: MESSAGES.routerState });
          }
        },
      };
    },
  }
);
