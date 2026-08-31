import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { asNode, type RnContext } from "./shared.js";

const MEMO_HOOKS = new Set(["useMemo", "useCallback"]);

const REACT_COMPILER_PACKAGES = ["babel-plugin-react-compiler", "react-compiler-runtime", "react-compiler-marker"];

// `memo` only from a bare call or off `React`, so a `cache.memo(...)` on some
// unrelated object is not mistaken for the React one.
const memoCalleeName = (node: AstNode): string | null => {
  const callee = asNode(node.callee);
  if (callee?.type === "Identifier") {
    const name = callee.name as string;
    if (MEMO_HOOKS.has(name) || name === "memo") return name;
    return null;
  }
  if (callee?.type !== "MemberExpression" || callee.computed === true) return null;
  if (asNode(callee.object)?.name !== "React") return null;
  const property = asNode(callee.property)?.name as string | undefined;
  return property !== undefined && (MEMO_HOOKS.has(property) || property === "memo") ? property : null;
};

// One pass over the source, then a binary search per call site, so a large file
// with several memos does not re-scan itself once per report.
const lineFinder = (text: string) => {
  const starts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1);
  }

  return (offset: number) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  };
};

// The React Compiler memoises everything it can, so a hand-written memo is
// normally either redundant or a fight with it. The compiler cannot see two
// things, which is why this is not a flat ban: how many times a list row will
// render, and what is expensive. Both are claims a person makes, so the rule
// asks for the claim in writing.
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

          const text = context.sourceCode?.getText?.() ?? "";
          const lineOf = lineFinder(text);
          const justified = new Set<number>();

          for (const comment of context.sourceCode?.getAllComments?.() ?? []) {
            if (!/^why:/i.test((comment.value ?? "").trim())) continue;
            for (let line = lineOf(comment.start); line <= lineOf(comment.end); line++) justified.add(line);
          }

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
