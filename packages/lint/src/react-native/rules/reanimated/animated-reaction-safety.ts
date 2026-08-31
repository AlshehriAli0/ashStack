import {
  calleeName,
  FUNCTION_TYPES,
  gate,
  hasAncestor,
  isMemberCall,
  isWithin,
  problem,
  receiverName,
  subtreeHas,
} from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { GateContext } from "./shared.js";

const MESSAGES = {
  hotBridgeUnguarded:
    "Guard this `scheduleOnRN` by comparing the current and previous prepared results, so high-frequency input does not bridge to RN every frame.",
  hotBridgeNoPrevious:
    "Take the previous prepared result as the callback's second parameter and guard `scheduleOnRN` on it differing from the current one, so high-frequency input does not bridge to RN every frame.",
};

const REACTION_HOOKS = new Set(["useAnimatedReaction"]);

/** True when an enclosing `if` tests the two callback parameters against each other. */
const guardsComparison = (node: AstNode, first: string | null, second: string | null): boolean => {
  if (!first || !second) return false;
  const compares = (test: AstNode | undefined): boolean => {
    if (!test) return false;
    if (test.type === "BinaryExpression" && (test.operator === "!==" || test.operator === "!=")) {
      const left = (test.left as AstNode | undefined)?.name;
      const right = (test.right as AstNode | undefined)?.name;
      return (left === first && right === second) || (left === second && right === first);
    }
    const argument = test.argument as AstNode | undefined;
    if (test.type === "UnaryExpression" && test.operator === "!" && calleeName(argument) === "is") {
      const names = (argument?.arguments as AstNode[] | undefined) ?? [];
      return names.some(entry => entry.name === first) && names.some(entry => entry.name === second);
    }
    return false;
  };
  return hasAncestor(node, current => current.type === "IfStatement" && compares(current.test as AstNode | undefined));
};

export const animatedReactionSafety: Rule = problem(
  "A `useAnimatedReaction` result callback loops forever if it writes a shared value the prepare callback reads. Guard `scheduleOnRN` there on the current result differing from the previous one.",
  {
    createOnce(context: GateContext) {
      let stack: AstNode[] = [];
      return {
        before() {
          stack = [];
          return gate(context, "useAnimatedReaction");
        },
        CallExpression(node) {
          const name = calleeName(node);
          if (REACTION_HOOKS.has(name)) {
            stack.push(node);
            return;
          }
          const reaction = stack.length > 0 ? stack[stack.length - 1] : null;
          if (!reaction) return;
          const args = (reaction.arguments as AstNode[] | undefined) ?? [];
          if (name === "set" || name === "modify") {
            if ((node.callee as AstNode | undefined)?.type !== "MemberExpression") return;
            const shared = receiverName(node);
            if (!shared) return;
            const prepare = args[0];
            const react = args[1];
            if (!prepare || !react || !isWithin(node, react)) return;
            const readsShared = subtreeHas(
              prepare,
              current => isMemberCall(current, "get") && receiverName(current) === shared
            );
            if (!readsShared) return;
            context.report({
              node,
              message: `Have this result callback ${
                name === "set" ? "write" : "modify"
              } a shared value its prepare callback does not read, or gate the call on a comparison; feeding its own input loops forever.`,
            });
            return;
          }
          if (name !== "scheduleOnRN") return;
          const callback = args[1];
          if (!callback || !FUNCTION_TYPES.has(callback.type)) return;
          const params = (callback.params as AstNode[] | undefined) ?? [];
          const current = params[0]?.type === "Identifier" ? (params[0].name as string) : null;
          const previous = params[1]?.type === "Identifier" ? (params[1].name as string) : null;
          if (!previous) {
            context.report({ node, message: MESSAGES.hotBridgeNoPrevious });
            return;
          }
          if (guardsComparison(node, current, previous)) return;
          context.report({ node, message: MESSAGES.hotBridgeUnguarded });
        },
        "CallExpression:exit"(node) {
          if (REACTION_HOOKS.has(calleeName(node))) stack.pop();
        },
      };
    },
  }
);
