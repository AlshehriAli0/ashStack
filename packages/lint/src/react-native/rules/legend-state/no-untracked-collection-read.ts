import { gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";
import { inTrackingContext, isObservableRef, textOf } from "./shared.js";

/**
 * Methods an observable `Map` or `Set` hands straight to the raw collection, so they subscribe to nothing.
 * `forEach` is left out: on an observable array it does track, and the two look the same here.
 */
const UNTRACKED_METHODS = new Set(["has", "entries", "keys", "values"]);

export const noUntrackedCollectionRead: Rule = problem(
  "Disallow `has`, `entries`, `keys` or `values` called on an observable inside a tracking context. On an observable `Map` or `Set` they read the raw collection and subscribe to nothing, so the selector never re-runs.",
  {
    createOnce(context) {
      return {
        before() {
          return gate(context, "$.");
        },
        CallExpression(node) {
          const { callee } = node;
          if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
          const method = callee.property.name;
          if (!UNTRACKED_METHODS.has(method) || !isObservableRef(callee.object)) return;
          if (!inTrackingContext(node)) return;

          const target = textOf(context, callee.object);
          context.report({
            node,
            message: `Read \`${target}.get().${method}(…)\` to track the collection, or keep per-item flags in a record and read one key (\`flags$[id].get()\`). \`${method}\` on an observable \`Map\` or \`Set\` subscribes to nothing, so this never re-runs.`,
          });
        },
      };
    },
  }
);
