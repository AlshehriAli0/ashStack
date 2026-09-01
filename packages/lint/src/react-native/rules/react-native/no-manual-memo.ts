import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { asNode, type Comment, type RnContext } from "./shared.js";

const MEMO_APIS = new Set(["useMemo", "useCallback", "memo"]);

const REACT_COMPILER_PACKAGES = ["babel-plugin-react-compiler", "react-compiler-runtime", "react-compiler-marker"];

const WHY_COMMENT = /^why:/i;

const NEWLINE = 10;

const bareMemoName = (callee: AstNode): string | null => {
  const name = callee.name as string;
  return MEMO_APIS.has(name) ? name : null;
};

const reactNamespacedMemoName = (callee: AstNode): string | null => {
  if (callee.computed === true) return null;
  if (asNode(callee.object)?.name !== "React") return null;
  const property = asNode(callee.property)?.name as string | undefined;
  return property !== undefined && MEMO_APIS.has(property) ? property : null;
};

const memoCalleeName = (node: AstNode): string | null => {
  const callee = asNode(node.callee);
  if (callee?.type === "Identifier") return bareMemoName(callee);
  if (callee?.type === "MemberExpression") return reactNamespacedMemoName(callee);
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

const linesCoveredByWhyComments = (comments: Comment[], lineOf: (offset: number) => number): Set<number> => {
  const covered = new Set<number>();
  for (const comment of comments) {
    if (!WHY_COMMENT.test((comment.value ?? "").trim())) continue;
    for (let line = lineOf(comment.start); line <= lineOf(comment.end); line++) covered.add(line);
  }
  return covered;
};

export const noManualMemo: Rule = problem(
  "Bans `useMemo`, `useCallback` and `memo` unless a `why:` comment on the line above states the case the React Compiler cannot see: something rendered per list row, or a cost that was measured.",
  {
    meta: { packages: REACT_COMPILER_PACKAGES },
    createOnce(context: RnContext) {
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

          const lineStarts = lineStartOffsets(context.sourceCode?.getText?.() ?? "");
          const lineOf = (offset: number) => lineContaining(lineStarts, offset);
          const justified = linesCoveredByWhyComments(context.sourceCode?.getAllComments?.() ?? [], lineOf);

          for (const { node, name } of calls) {
            const line = lineOf(node.start as number);
            if (justified.has(line) || justified.has(line - 1)) continue;

            context.report({
              node,
              message: `Drop this \`${name}\` and let the React Compiler memoise it. Keep it only for what the compiler cannot see — something rendered per row in a list, or a computation you measured as heavy — and write a \`why:\` comment on the line above saying which of the two it is.`,
            });
          }
        },
      };
    },
  }
);
