import type { AstNode, RuleContext } from "../../../lib/types.js";

/** oxlint's context, narrowed to the source text `gate` and the messages read. */
export type GateContext = RuleContext & {
  sourceCode?: { text?: string; getText?: (node?: AstNode) => string };
};

export const OBSERVABLE_FACTORIES = new Set(["observable", "useObservable"]);

/** The trailing `$` that marks an observable binding. */
export const OBS = /\$$/;

/** The identifier a member chain is rooted at: `count$`, or the `settings$` of `settings$.theme.color`. */
const rootName = (node: AstNode | null | undefined): string | null => {
  let current: AstNode | undefined = node ?? undefined;
  while (current?.type === "MemberExpression") current = current.object as AstNode | undefined;
  return current?.type === "Identifier" ? (current.name as string) : null;
};

export const isObservableRef = (node: AstNode | null | undefined): boolean => {
  const root = rootName(node);
  return root != null && OBS.test(root);
};

/** The factory name when this call is `observable(...)` or `useObservable(...)`. */
export const factoryCalled = (node: AstNode | null | undefined): string | null => {
  const callee = node?.callee as AstNode | undefined;
  return node?.type === "CallExpression" &&
    callee?.type === "Identifier" &&
    OBSERVABLE_FACTORIES.has(callee.name as string)
    ? (callee.name as string)
    : null;
};

/** Source text for a node, when the linter exposes it. */
export const textOf = (context: GateContext, node: AstNode | undefined): string | undefined =>
  context.sourceCode?.getText?.(node);
