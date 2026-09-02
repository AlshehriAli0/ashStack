import { problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const SIDED = "ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr";
const CORNERED = "border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br";
const WHOLE = "text-left|text-right|float-left|float-right|clear-left|clear-right";

const UTILITY = String.raw`(?:(?:${SIDED})-\S+|(?:${CORNERED})(?:-\S+)?|${WHOLE})`;

/** One utility standing alone in a class string, seen through variant prefixes and the `!`/`-` modifiers. */
const PHYSICAL_UTILITY = new RegExp(String.raw`(?:^|\s)(?:[^\s:]+:)*!?-?${UTILITY}(?:\s|$)`);

/**
 * The same utilities with no surrounding whitespace required. Inside a file a
 * class string is quote-delimited, so the anchored pattern above would miss
 * `className="ml-2"` and skip the file; this one matches a superset, so the
 * gate can only over-subscribe, never miss.
 */
const ANY_PHYSICAL = new RegExp(UTILITY);

const USE_LOGICAL =
  "Swap this for its logical twin so the layout mirrors in Arabic and Hebrew: `ms`/`me` instead of `ml`/`mr`, `text-start` instead of `text-left`. Padding, insets, borders and corners follow the same pattern. Keep the physical utility only where the coordinate really is the screen rather than the reading order.";

export const useLogicalClasses: Rule = problem(
  "Require a logical Tailwind utility over its physical left/right twin, so a right-to-left layout mirrors. Reads through variant prefixes and the `!` and `-` modifiers.",
  {
    createOnce(context: RuleContext) {
      return {
        /** `Literal` and `TemplateElement` are everywhere, so skip the file whole when it holds none. */
        before() {
          return ANY_PHYSICAL.test(context.sourceCode.text);
        },
        Literal(node) {
          if (typeof node.value !== "string") return;
          if (!PHYSICAL_UTILITY.test(node.value)) return;
          context.report({ node, message: USE_LOGICAL });
        },
        TemplateElement(node) {
          if (!PHYSICAL_UTILITY.test(node.value.raw)) return;
          context.report({ node, message: USE_LOGICAL });
        },
      };
    },
  }
);
