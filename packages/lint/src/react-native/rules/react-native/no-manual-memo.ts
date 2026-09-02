import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MEMO_APIS = new Set(["useMemo", "useCallback", "memo"]);

const WHY_COMMENT = /^why:/i;

const NEWLINE = 10;

type Comments = ReturnType<RuleContext["sourceCode"]["getAllComments"]>;

const bareMemoName = (callee: AstNode): string | null =>
  callee.type === "Identifier" && MEMO_APIS.has(callee.name) ? callee.name : null;

const reactNamespacedMemoName = (callee: AstNode): string | null => {
  if (callee.type !== "MemberExpression" || callee.computed) return null;
  if (callee.object.type !== "Identifier" || callee.object.name !== "React") return null;
  const property = callee.property.name;
  return MEMO_APIS.has(property) ? property : null;
};

const memoCalleeName = (node: AstNode): string | null => {
  if (node.type !== "CallExpression") return null;
  const { callee } = node;
  if (callee.type === "Identifier") return bareMemoName(callee);
  if (callee.type === "MemberExpression") return reactNamespacedMemoName(callee);
  return null;
};

const lineStartOffsets = (text: string): number[] => {
  const starts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === NEWLINE) starts.push(index + 1);
  }
  return starts;
};

const lineContaining = (starts: number[], offset: number): number => {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if ((starts[middle] ?? 0) <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
};

const linesCoveredByWhyComments = (comments: Comments, lineOf: (offset: number) => number): Set<number> => {
  const covered = new Set<number>();
  for (const comment of comments) {
    if (!WHY_COMMENT.test(comment.value.trim())) continue;
    for (let line = lineOf(comment.start); line <= lineOf(comment.end); line++) covered.add(line);
  }
  return covered;
};

export const noManualMemo: Rule = problem(
  "Require a `// why:` line above every kept `useMemo`, `useCallback` and `memo`. The React Compiler memoises on a best-effort basis, not a guarantee, so a memo is allowed where the cost is real: something rendered per list row, or a computation measured as heavy. The `// why:` line names which of the two applies. `@ashstack/core/no-comments` keeps that line and never counts it against its `budget`, so both rules run together. Assumes the compiler is on — pass `reactCompiler: false` to the entry and this rule turns off, since without it a hand-written memo is the only memo there is.",
  {
    createOnce(context: RuleContext) {
      let calls: { node: AstNode; name: string }[] = [];
      return {
        before() {
          calls = [];
          return gate(context, "useMemo", "useCallback", "memo");
        },
        CallExpression(node) {
          const name = memoCalleeName(node);
          if (name !== null) calls.push({ node, name });
        },
        "Program:exit"() {
          if (calls.length === 0) return;

          const lineStarts = lineStartOffsets(context.sourceCode.getText());
          const lineOf = (offset: number) => lineContaining(lineStarts, offset);
          const justified = linesCoveredByWhyComments(context.sourceCode.getAllComments(), lineOf);

          for (const { node, name } of calls) {
            const line = lineOf(node.start);
            if (justified.has(line) || justified.has(line - 1)) continue;

            context.report({
              node,
              message: `The React Compiler memoises on a best-effort basis, not a guarantee, so a \`${name}\` is allowed where you know the cost is real: something rendered per row in a list, or a computation you measured as heavy. Add a \`// why:\` line directly above it naming which of the two applies. If neither does, delete the \`${name}\`.`,
            });
          }
        },
      };
    },
  }
);
