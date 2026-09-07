import { ancestors, FUNCTION_TYPES, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DEFAULT_MAX = 15;

/** Every structure that costs a point of its own and deepens whatever sits inside it. */
const NESTING_STRUCTURES = new Set([
  "IfStatement",
  "SwitchStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause",
  "ConditionalExpression",
]);

/** Operators that read as a decision. `??` is a default, and `prefer-nullish-coalescing` asks for it. */
const DECIDING_OPERATORS = new Set(["&&", "||"]);

/**
 * An `else if`: the next branch of the decision above it rather than a
 * decision inside it, so it costs a flat point and deepens nothing.
 */
const isElseIf = (node: AstNode): boolean => {
  if (node.type !== "IfStatement") return false;
  const { parent } = node;
  return parent.type === "IfStatement" && parent.alternate === node;
};

/** A real `else`, as opposed to the `else if` that carries the next branch. */
const isElseBlock = (alternate: AstNode | null | undefined): boolean =>
  alternate !== null && alternate !== undefined && alternate.type !== "IfStatement";

/**
 * How deep `node` sits inside its own function, counting only the structures
 * that cost. The walk stops at the function boundary: a callback is scored on
 * its own, so extracting one really does pay off instead of costing the
 * nesting it adds.
 */
const nestingOf = (node: AstNode): number => {
  let depth = 0;
  for (const current of ancestors(node)) {
    if (FUNCTION_TYPES.has(current.type)) return depth;
    if (NESTING_STRUCTURES.has(current.type) && !isElseIf(current)) depth += 1;
  }
  return depth;
};

export const maxComplexity: Rule = problem(
  "Cap the cognitive complexity of one function: its branches, weighted by nesting depth. An `if`, `switch`, loop, `catch` or ternary costs a point plus one per enclosing structure. An `else` or a run of `&&`/`||` costs a flat point, `??` costs nothing. A nested function is scored on its own. Replaces the built-in `complexity`, which reads a 20-case `switch` as 20 decisions.",
  {
    meta: {
      schema: [
        {
          type: "integer",
          minimum: 1,
          default: DEFAULT_MAX,
          description: "Highest cognitive complexity one function may reach.",
        },
      ],
    },
    createOnce(context: RuleContext) {
      let max = DEFAULT_MAX;
      let score = 0;
      /** The score of each function this one is nested in, innermost last. */
      const enclosing: number[] = [];

      const enter = (): void => {
        enclosing.push(score);
        score = 0;
      };

      const leave = (node: AstNode): void => {
        const total = score;
        score = enclosing.pop() ?? 0;
        if (total <= max) return;
        context.report({
          node,
          message: `Extract the deepest branches into functions of their own — ${total} cognitive complexity, past ${max}. Depth is what costs: an \`if\` two structures in counts 3.`,
        });
      };

      const structure = (node: AstNode): void => {
        score += 1 + nestingOf(node);
      };

      return {
        before() {
          max = typeof context.options[0] === "number" ? context.options[0] : DEFAULT_MAX;
          score = 0;
          enclosing.length = 0;
          return true;
        },
        FunctionDeclaration: enter,
        FunctionExpression: enter,
        ArrowFunctionExpression: enter,
        "FunctionDeclaration:exit": leave,
        "FunctionExpression:exit": leave,
        "ArrowFunctionExpression:exit": leave,
        IfStatement(node) {
          score += isElseIf(node) ? 1 : 1 + nestingOf(node);
          if (isElseBlock(node.alternate)) score += 1;
        },
        SwitchStatement: structure,
        ForStatement: structure,
        ForInStatement: structure,
        ForOfStatement: structure,
        WhileStatement: structure,
        DoWhileStatement: structure,
        CatchClause: structure,
        ConditionalExpression: structure,
        LogicalExpression(node) {
          if (!DECIDING_OPERATORS.has(node.operator)) return;
          const { parent } = node;
          if (parent.type === "LogicalExpression" && parent.operator === node.operator) return;
          score += 1;
        },
      };
    },
  }
);
