import { FUNCTION_TYPES, hasAncestor, problem, subtreeHas } from "../../../lib/ast.js";
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
const findBuilderCall = (value: unknown): AstNode | null => {
  let found: AstNode | null = null;
  subtreeHas(value, current => {
    const callee = current.callee as AstNode | undefined;
    const property = callee?.property as AstNode | undefined;
    if (
      current.type === "CallExpression" &&
      callee?.type === "MemberExpression" &&
      property?.type === "Identifier" &&
      LAYOUT_BUILDER_METHODS.has(property.name as string)
    ) {
      found = current;
      return true;
    }
    return false;
  });
  return found;
};

export const hoistLayoutAnimationBuilder: Rule = problem(
  "A layout animation belongs at module scope, or inside a memo when it depends on component values. The `entering`/`exiting`/`layout` props otherwise rebuild it on every render.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXAttribute(node) {
          if (!LAYOUT_ATTRIBUTES.has((node.name as AstNode | undefined)?.name as string)) return;
          if (!hasAncestor(node, current => FUNCTION_TYPES.has(current.type))) return;
          const builderCall = findBuilderCall(node.value);
          if (!builderCall) return;
          context.report({ node: builderCall, message: LAYOUT_BUILDER });
        },
      };
    },
  }
);
