import { findInSubtree, FUNCTION_TYPES, hasAncestor, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const LAYOUT_BUILDER =
  "Build this layout animation at module scope when it is static, or memoize it when it depends on component values.";

const LAYOUT_ATTRIBUTES = new Set(["entering", "exiting", "layout"]);

const LAYOUT_BUILDER_METHODS = new Set([
  "duration",
  "delay",
  "springify",
  "damping",
  "stiffness",
  "mass",
  "easing",
  "withCallback",
  "withInitialValues",
  "withTargetValues",
]);

/** The builder call inside a layout-animation prop value, if there is one. */
const findBuilderCall = (value: unknown): AstNode | null =>
  findInSubtree(value, current => {
    if (current.type !== "CallExpression" || current.callee.type !== "MemberExpression") return false;
    const { property } = current.callee;
    return property.type === "Identifier" && LAYOUT_BUILDER_METHODS.has(property.name);
  });

export const hoistLayoutAnimationBuilder: Rule = problem(
  "A layout animation belongs at module scope, or inside a memo when it depends on component values. The `entering`/`exiting`/`layout` props otherwise rebuild it on every render.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXAttribute(node) {
          if (node.type !== "JSXAttribute" || node.name.type !== "JSXIdentifier") return;
          if (!LAYOUT_ATTRIBUTES.has(node.name.name)) return;
          if (!hasAncestor(node, current => FUNCTION_TYPES.has(current.type))) return;
          const builderCall = findBuilderCall(node.value);
          if (!builderCall) return;
          context.report({ node: builderCall, message: LAYOUT_BUILDER });
        },
      };
    },
  }
);
