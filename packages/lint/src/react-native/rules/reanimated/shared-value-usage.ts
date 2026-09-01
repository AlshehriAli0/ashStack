import {
  closestAncestor,
  crossesFunctionBefore,
  FUNCTION_TYPES,
  isMemberCall,
  problem,
  receiverName,
  subtreeHas,
} from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { isProducerCall } from "./shared.js";

const MESSAGES = {
  renderRead:
    "Read this inside `useAnimatedStyle`/`useAnimatedProps`, or mirror non-visual state through an explicit callback. A `.get()` while JSX is evaluated is untracked, so the rendered value never updates.",
  renderWrite: "Move this write into an event handler, an effect, or an animation callback — render must stay pure.",
  destructure:
    "Keep the SharedValue object itself and read or write it with `.get()` / `.set(...)`; destructuring detaches the value from Reanimated reactivity.",
  nestedProperty:
    "Assign a new value with `.set(...)`, or use `.modify()` for a large object; mutating a property returned by `.get()` bypasses shared-value reactivity.",
  nestedCollection:
    "Assign a new collection with `.set(...)`, or mutate inside `.modify()`; mutating the collection returned by `.get()` bypasses shared-value reactivity.",
};

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "copyWithin",
  "fill",
  "set",
  "add",
  "delete",
  "clear",
]);

const JSX_HOSTS = new Set(["JSXExpressionContainer", "JSXAttribute"]);

/** True for `sv.get().push(...)` and friends — a mutation of the collection `get()` handed back. */
const mutatesWhatGetReturned = (node: AstNode): boolean => {
  if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return false;
  const { object, property } = node.callee;
  return property.type === "Identifier" && MUTATING_METHODS.has(property.name) && isMemberCall(object, "get");
};

/** True when the call is evaluated as JSX is built, rather than inside a callback JSX only passes along. */
const runsWhileJsxEvaluates = (node: AstNode): boolean => {
  const host = closestAncestor(node, JSX_HOSTS);
  if (!host) return false;
  if (crossesFunctionBefore(node, host, FUNCTION_TYPES)) return false;
  return !subtreeHas(host, current => FUNCTION_TYPES.has(current.type));
};

interface Candidate {
  node: AstNode;
  shared: string;
  isGet: boolean;
}

export const sharedValueUsage: Rule = problem(
  "Destructuring a shared value or mutating what its `get()` returned detaches it from Reanimated reactivity. Reading or writing one while JSX evaluates also makes render impure.",
  {
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
          const { id, init } = node;
          if (id.type === "Identifier" && isProducerCall(init)) {
            names.add(id.name);
            return;
          }
          if (id.type !== "ObjectPattern") return;
          if (init?.type !== "CallExpression") return;
          if (init.callee.type !== "Identifier" || init.callee.name !== "useSharedValue") return;
          const destructuresValue = id.properties.some(property => {
            if (property.type !== "Property") return false;
            const { key } = property;
            return key.type === "Identifier" && key.name === "value";
          });
          if (destructuresValue) context.report({ node, message: MESSAGES.destructure });
        },
        AssignmentExpression(node) {
          if (node.type !== "AssignmentExpression" || node.left.type !== "MemberExpression") return;
          if (!isMemberCall(node.left.object, "get")) return;
          context.report({ node, message: MESSAGES.nestedProperty });
        },
        CallExpression(node) {
          if (node.type !== "CallExpression") return;
          if (mutatesWhatGetReturned(node)) {
            context.report({ node, message: MESSAGES.nestedCollection });
            return;
          }
          const isGet = isMemberCall(node, "get") && node.arguments.length === 0;
          if (!isGet && !isMemberCall(node, "set")) return;
          const shared = receiverName(node);
          if (!shared) return;
          if (!runsWhileJsxEvaluates(node)) return;
          candidates.push({ node, shared, isGet });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!names.has(candidate.shared)) continue;
            context.report({
              node: candidate.node,
              message: candidate.isGet ? MESSAGES.renderRead : MESSAGES.renderWrite,
            });
          }
        },
      };
    },
  }
);
