import { ancestors, COMPONENT_OR_HOOK, isFunction, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const COMPONENT_NAME = /^[A-Z]/;

type Scope = ReturnType<RuleContext["sourceCode"]["getScope"]>;

const boundFunctionName = (node: AstNode): string | null => {
  if (node.type === "FunctionDeclaration") return node.id?.name ?? null;
  const { parent } = node;
  if (parent === null || parent.type !== "VariableDeclarator" || parent.id.type !== "Identifier") return null;
  return parent.id.name;
};

const enclosingReactFunction = (node: AstNode): AstNode | null => {
  for (const current of ancestors(node)) {
    if (!isFunction(current)) continue;
    const name = boundFunctionName(current);
    if (name !== null && COMPONENT_OR_HOOK.test(name)) return current;
  }
  return null;
};

const scopeContains = (scope: Scope | null | undefined, ancestor: Scope): boolean => {
  for (let current = scope; current !== null && current !== undefined; current = current.upper) {
    if (current === ancestor) return true;
  }
  return false;
};

const readsComponentScope = (scope: Scope, componentScope: Scope): boolean => {
  for (const reference of scope.through) {
    if (scopeContains(reference.resolved?.scope, componentScope)) return true;
  }
  return false;
};

export const hoistStatelessFunction: Rule = problem(
  "Requires module scope for a non-component function that reads nothing from the component around it. Out there it is created once, keeps a stable identity, and can be tested without rendering.",
  {
    createOnce(context: RuleContext) {
      const check = (node: AstNode) => {
        const name = boundFunctionName(node);
        if (name === null || COMPONENT_NAME.test(name)) return;

        const component = enclosingReactFunction(node);
        if (component === null) return;

        const scope = context.sourceCode.getScope(node);
        const componentScope = context.sourceCode.getScope(component);
        if (readsComponentScope(scope, componentScope)) return;

        context.report({
          node,
          message: `Move \`${name}\` to module scope: it reads nothing from the component, so out there it is created once and keeps a stable identity without memoising. If it was meant to read a prop or a piece of state, wire that read up instead.`,
        });
      };
      return {
        FunctionDeclaration: check,
        FunctionExpression: check,
        ArrowFunctionExpression: check,
      };
    },
  }
);
