import type { AstNode, RuleContext } from "../packages/lint/dist/lib/types.js";

/**
 * Build an AST node literal for a helper test.
 *
 * The helpers in `lib/ast.ts` and `react-native/stylesheet.ts` are pure
 * structure walks over ESTree shapes, so a plain object is a faithful input.
 * Rules are exercised against the real oxlint AST through `moduleTests` in
 * `harness.ts`; these builders exist so a helper's branches can be pinned one
 * at a time.
 */
export const node = (shape: Record<string, unknown>): AstNode => shape as unknown as AstNode;

const SKIPPED = new Set(["parent", "loc", "range", "start", "end", "type"]);

const link = (current: unknown, parent: AstNode | null): void => {
  if (current === null || typeof current !== "object") return;
  if (Array.isArray(current)) {
    for (const item of current) link(item, parent);
    return;
  }
  const record = current as Record<string, unknown>;
  const self = typeof record.type === "string" ? node(record) : null;
  if (self !== null) record.parent = parent;
  for (const [key, value] of Object.entries(record)) {
    if (SKIPPED.has(key)) continue;
    link(value, self ?? parent);
  }
};

/** Set `parent` on every node in the tree, the way oxlint does, and return the root. */
export const linked = <T extends AstNode>(root: T): T => {
  link(root, null);
  return root;
};

/** The slice of `RuleContext` the shared helpers read. */
export const ruleContext = (parts: { text?: string; options?: unknown[]; filename?: string }): RuleContext =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  ({
    sourceCode: { text: parts.text ?? "" },
    options: parts.options ?? [],
    filename: parts.filename ?? "case.tsx",
    report: () => undefined,
  }) as unknown as RuleContext;
