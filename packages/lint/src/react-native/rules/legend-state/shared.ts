import type { AstNode, RuleContext } from "../../../lib/types.js";

export const OBSERVABLE_FACTORIES = new Set(["observable", "useObservable"]);

/** The trailing `$` that marks an observable binding. */
export const OBS = /\$$/;

/** The identifier a member chain is rooted at: `count$`, or the `settings$` of `settings$.theme.color`. */
const rootName = (node: AstNode | null | undefined): string | null => {
  let current: AstNode | null | undefined = node;
  while (current?.type === "MemberExpression") current = current.object;
  return current?.type === "Identifier" ? current.name : null;
};

export const isObservableRef = (node: AstNode | null | undefined): boolean => {
  const root = rootName(node);
  return root != null && OBS.test(root);
};

/** The factory name when this call is `observable(...)` or `useObservable(...)`. */
export const factoryCalled = (node: AstNode | null | undefined): string | null => {
  if (node?.type !== "CallExpression") return null;
  const { callee } = node;
  return callee.type === "Identifier" && OBSERVABLE_FACTORIES.has(callee.name) ? callee.name : null;
};

/** Source text for a node, for quoting it back in a message. */
export const textOf = (context: RuleContext, node: AstNode): string => context.sourceCode.getText(node);
