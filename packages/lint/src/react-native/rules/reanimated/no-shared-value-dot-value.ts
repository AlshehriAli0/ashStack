import type { AstNode, Rule, RuleContext, RuleMeta } from "../../../lib/types.js";
import { isProducerCall } from "./shared.js";

const MESSAGES = {
  read: "Read this shared value with `.get()` so the React Compiler can track the read.",
  write: "Write this shared value with `.set(...)` so the React Compiler can track the mutation.",
  compound:
    "Write this shared value with `.set(v => ...)`, or `.set(x.get() ...)`, so the React Compiler can track the mutation.",
};

const COMPOUND_OPERATORS = new Map([
  ["+=", "+"],
  ["-=", "-"],
  ["*=", "*"],
  ["/=", "/"],
]);

const isDotValue = (node: AstNode | null | undefined): boolean => {
  if (node?.type !== "MemberExpression") return false;
  if (node.optional === true || node.computed === true) return false;
  const object = node.object as AstNode | undefined;
  const property = node.property as AstNode | undefined;
  return object?.type === "Identifier" && property?.type === "Identifier" && property.name === "value";
};

interface Candidate {
  node: AstNode;
  kind: "read" | "write" | "compound";
  operator?: string;
  name: string;
}

interface Fixer {
  replaceText(node: AstNode, text: string): unknown;
}

interface SourceCode {
  getText(node: AstNode): string;
}

type DotValueContext = RuleContext & { sourceCode?: SourceCode; getSourceCode(): SourceCode };

export const noSharedValueDotValue: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Shared values are read with `.get()` and written with `.set(...)`, never through `.value`. React Compiler cannot track a `.value` access.",
    },
    hasSuggestions: true,
  } as RuleMeta,
  createOnce(context: DotValueContext) {
    const names = new Set<string>();
    const candidates: Candidate[] = [];
    const source = (): SourceCode => context.sourceCode ?? context.getSourceCode();
    return {
      before() {
        names.clear();
        candidates.length = 0;
      },
      VariableDeclarator(node) {
        const id = node.id as AstNode | undefined;
        if (id?.type === "Identifier" && isProducerCall(node.init as AstNode | undefined)) {
          names.add(id.name as string);
        }
      },
      AssignmentExpression(node) {
        const left = node.left as AstNode | undefined;
        if (!isDotValue(left)) return;
        const operator = COMPOUND_OPERATORS.get(node.operator as string);
        if (!operator && node.operator !== "=") return;
        candidates.push({
          node,
          kind: operator ? "compound" : "write",
          operator,
          name: (left?.object as AstNode).name as string,
        });
      },
      MemberExpression(node) {
        if (!isDotValue(node)) return;
        if (node.parent?.type === "AssignmentExpression" && node.parent.left === node) return;
        candidates.push({ node, kind: "read", name: (node.object as AstNode).name as string });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          if (!names.has(candidate.name)) continue;
          const { node, name, kind, operator } = candidate;
          if (kind === "read") {
            context.report({
              node,
              message: MESSAGES.read,
              suggest: [
                { desc: `Rewrite as ${name}.get()`, fix: (fixer: Fixer) => fixer.replaceText(node, `${name}.get()`) },
              ],
            });
            continue;
          }
          const right = source().getText(node.right as AstNode);
          const replacement =
            kind === "compound" ? `${name}.set(${name}.get() ${operator} (${right}))` : `${name}.set(${right})`;
          context.report({
            node,
            message: kind === "compound" ? MESSAGES.compound : MESSAGES.write,
            suggest: [
              { desc: `Rewrite as ${name}.set(...)`, fix: (fixer: Fixer) => fixer.replaceText(node, replacement) },
            ],
          });
        }
      },
    };
  },
};
