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

const NOT_EQUAL_OPERATORS = new Set(["!==", "!="]);

const identifierName = (node: AstNode | undefined): string | null =>
  node?.type === "Identifier" ? (node.name as string) : null;

const comparesWithNotEqual = (test: AstNode, first: string, second: string): boolean => {
  if (test.type !== "BinaryExpression" || !NOT_EQUAL_OPERATORS.has(test.operator as string)) return false;
  const left = (test.left as AstNode | undefined)?.name;
  const right = (test.right as AstNode | undefined)?.name;
  return (left === first && right === second) || (left === second && right === first);
};

const comparesWithNegatedIs = (test: AstNode, first: string, second: string): boolean => {
  if (test.type !== "UnaryExpression" || test.operator !== "!") return false;
  const argument = test.argument as AstNode | undefined;
  if (calleeName(argument) !== "is") return false;
  const compared = (argument?.arguments as AstNode[] | undefined) ?? [];
  return compared.some(entry => entry.name === first) && compared.some(entry => entry.name === second);
};

/** True when an enclosing `if` tests the two callback parameters against each other. */
const guardsComparison = (node: AstNode, first: string | null, second: string | null): boolean => {
  if (!first || !second) return false;
  return hasAncestor(node, current => {
    if (current.type !== "IfStatement") return false;
    const test = current.test as AstNode | undefined;
    if (!test) return false;
    return comparesWithNotEqual(test, first, second) || comparesWithNegatedIs(test, first, second);
  });
};

/** True when a `.set()`/`.modify()` in the result callback writes what the prepare callback reads. */
const feedsOwnInput = (node: AstNode, reaction: AstNode): boolean => {
  if ((node.callee as AstNode | undefined)?.type !== "MemberExpression") return false;
  const shared = receiverName(node);
  if (!shared) return false;
  const args = (reaction.arguments as AstNode[] | undefined) ?? [];
  const prepare = args[0];
  const react = args[1];
  if (!prepare || !react || !isWithin(node, react)) return false;
  return subtreeHas(prepare, current => isMemberCall(current, "get") && receiverName(current) === shared);
};

/** What is wrong with a `scheduleOnRN` inside a reaction, or null when it is guarded. */
const hotBridgeProblem = (node: AstNode, reaction: AstNode): string | null => {
  const callback = ((reaction.arguments as AstNode[] | undefined) ?? [])[1];
  if (!callback || !FUNCTION_TYPES.has(callback.type)) return null;
  const params = (callback.params as AstNode[] | undefined) ?? [];
  const previous = identifierName(params[1]);
  if (!previous) return MESSAGES.hotBridgeNoPrevious;
  return guardsComparison(node, identifierName(params[0]), previous) ? null : MESSAGES.hotBridgeUnguarded;
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
          const reaction = stack.at(-1);
          if (!reaction) return;
          if (name === "set" || name === "modify") {
            if (!feedsOwnInput(node, reaction)) return;
            context.report({
              node,
              message: `Have this result callback ${
                name === "set" ? "write" : "modify"
              } a shared value its prepare callback does not read, or gate the call on a comparison; feeding its own input loops forever.`,
            });
            return;
          }
          if (name !== "scheduleOnRN") return;
          const problemMessage = hotBridgeProblem(node, reaction);
          if (problemMessage !== null) context.report({ node, message: problemMessage });
        },
        "CallExpression:exit"(node) {
          if (REACTION_HOOKS.has(calleeName(node))) stack.pop();
        },
      };
    },
  }
);
