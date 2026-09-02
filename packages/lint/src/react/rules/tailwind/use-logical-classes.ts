import { attributeName, hasAncestor, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { CLASS_ATTRIBUTE, CLASS_BINDING } from "./shared.js";

const SIDED = "ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr";
const CORNERED = "border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br";
const WHOLE = "text-left|text-right|float-left|float-right|clear-left|clear-right";

const UTILITY = String.raw`(?:(?:${SIDED})-\S+|(?:${CORNERED})(?:-\S+)?|${WHOLE})`;

/**
 * A class string is delimited by a quote, a brace or a backtick as often as by
 * whitespace, so all of them bound a utility. That makes the pattern read the
 * same whether it is given one class string or the whole file text.
 */
const BOUNDARY = String.raw`[\s"'\`{}]`;

/** One utility standing alone in a class string, seen through variant prefixes and the `!`/`-` modifiers. */
const PHYSICAL_UTILITY = new RegExp(String.raw`(?:^|${BOUNDARY})(?:[^\s:]+:)*!?-?${UTILITY}(?:$|${BOUNDARY})`);

const USE_LOGICAL =
  "Swap this for its logical twin so the layout mirrors in Arabic and Hebrew: `ms`/`me` instead of `ml`/`mr`, `text-start` instead of `text-left`. Padding, insets, borders and corners follow the same pattern. Keep the physical utility only where the coordinate really is the screen rather than the reading order.";

/**
 * Whether a string sits somewhere a class value is expected. `right-hand` and
 * `left-over` are utilities in a `className` and ordinary English anywhere
 * else, so the context is what separates the two.
 */
const inClassValue = (node: AstNode): boolean =>
  hasAncestor(node, current => {
    if (current.type === "JSXAttribute") return CLASS_ATTRIBUTE.test(attributeName(current));
    if (current.type !== "VariableDeclarator") return false;
    return current.id.type === "Identifier" && CLASS_BINDING.test(current.id.name);
  });

export const useLogicalClasses: Rule = problem(
  "Require a logical Tailwind utility over its physical left/right twin, so a right-to-left layout mirrors. Reads class props and bindings named after classes, through variant prefixes and the `!` and `-` modifiers.",
  {
    createOnce(context: RuleContext) {
      return {
        /** `Literal` and `TemplateElement` are everywhere, so skip the file whole when it holds no such utility. */
        before() {
          return PHYSICAL_UTILITY.test(context.sourceCode.text);
        },
        Literal(node) {
          if (typeof node.value !== "string") return;
          if (!PHYSICAL_UTILITY.test(node.value)) return;
          if (!inClassValue(node)) return;
          context.report({ node, message: USE_LOGICAL });
        },
        TemplateElement(node) {
          if (!PHYSICAL_UTILITY.test(node.value.raw)) return;
          if (!inClassValue(node)) return;
          context.report({ node, message: USE_LOGICAL });
        },
      };
    },
  }
);
