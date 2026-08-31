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
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type === "Identifier" && isProducerCall(init)) {
            names.add(id.name as string);
            return;
          }
          if (id?.type !== "ObjectPattern") return;
          if (init?.type !== "CallExpression" || (init.callee as AstNode | undefined)?.name !== "useSharedValue") {
            return;
          }
          const destructuresValue = ((id.properties as AstNode[] | undefined) ?? []).some(property => {
            const key = property.key as AstNode | undefined;
            return key?.type === "Identifier" && key.name === "value";
          });
          if (destructuresValue) context.report({ node, message: MESSAGES.destructure });
        },
        AssignmentExpression(node) {
          const left = node.left as AstNode | undefined;
          if (left?.type !== "MemberExpression") return;
          if (!isMemberCall(left.object as AstNode | undefined, "get")) return;
          context.report({ node, message: MESSAGES.nestedProperty });
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          const property = callee?.property as AstNode | undefined;
          if (
            callee?.type === "MemberExpression" &&
            property?.type === "Identifier" &&
            MUTATING_METHODS.has(property.name as string) &&
            isMemberCall(callee.object as AstNode | undefined, "get")
          ) {
            context.report({ node, message: MESSAGES.nestedCollection });
            return;
          }
          const isGet = isMemberCall(node, "get") && ((node.arguments as AstNode[] | undefined) ?? []).length === 0;
          const isSet = isMemberCall(node, "set");
          if (!isGet && !isSet) return;
          const shared = receiverName(node);
          if (!shared) return;
          const host = closestAncestor(node, JSX_HOSTS);
          if (!host) return;
          if (crossesFunctionBefore(node, host, FUNCTION_TYPES)) return;
          if (subtreeHas(host, current => FUNCTION_TYPES.has(current.type))) return;
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
