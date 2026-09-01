import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
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

/** The identifier a plain `x.value` reads from, or null when the node is not one. */
const dotValueOwner = (node: AstNode | null | undefined): string | null => {
  if (node?.type !== "MemberExpression" || node.optional || node.computed) return null;
  const { object, property } = node;
  if (object.type !== "Identifier") return null;
  if (property.type !== "Identifier" || property.name !== "value") return null;
  return object.name;
};

type Candidate =
  | { kind: "read"; node: AstNode; name: string }
  | { kind: "write"; node: AstNode; name: string; right: AstNode }
  | { kind: "compound"; node: AstNode; name: string; operator: string; right: AstNode };

export const noSharedValueDotValue: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Shared values are read with `.get()` and written with `.set(...)`, never through `.value`. React Compiler cannot track a `.value` access.",
    },
    hasSuggestions: true,
  },
  createOnce(context: RuleContext) {
    const names = new Set<string>();
    const candidates: Candidate[] = [];
    return {
      before() {
        names.clear();
        candidates.length = 0;
      },
      VariableDeclarator(node) {
        if (node.type !== "VariableDeclarator") return;
        if (node.id.type === "Identifier" && isProducerCall(node.init)) {
          names.add(node.id.name);
        }
      },
      AssignmentExpression(node) {
        if (node.type !== "AssignmentExpression") return;
        const name = dotValueOwner(node.left);
        if (name === null) return;
        const operator = COMPOUND_OPERATORS.get(node.operator);
        if (operator) {
          candidates.push({ kind: "compound", node, name, operator, right: node.right });
          return;
        }
        if (node.operator !== "=") return;
        candidates.push({ kind: "write", node, name, right: node.right });
      },
      MemberExpression(node) {
        const name = dotValueOwner(node);
        if (name === null) return;
        if (node.parent?.type === "AssignmentExpression" && node.parent.left === node) return;
        candidates.push({ kind: "read", node, name });
      },
      "Program:exit"() {
        for (const candidate of candidates) {
          const { node, name } = candidate;
          if (!names.has(name)) continue;
          if (candidate.kind === "read") {
            context.report({
              node,
              message: MESSAGES.read,
              suggest: [{ desc: `Rewrite as ${name}.get()`, fix: fixer => fixer.replaceText(node, `${name}.get()`) }],
            });
            continue;
          }
          const right = context.sourceCode.getText(candidate.right);
          const replacement =
            candidate.kind === "compound"
              ? `${name}.set(${name}.get() ${candidate.operator} (${right}))`
              : `${name}.set(${right})`;
          context.report({
            node,
            message: candidate.kind === "compound" ? MESSAGES.compound : MESSAGES.write,
            suggest: [{ desc: `Rewrite as ${name}.set(...)`, fix: fixer => fixer.replaceText(node, replacement) }],
          });
        }
      },
    };
  },
};
