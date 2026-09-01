import { calleeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ANIMATED_STYLE_HOOKS } from "./shared.js";

const GPU_PROPERTIES_ONLY =
  "Animate `transform` and `opacity` instead: a panel that grows is `scaleY` with `transformOrigin`, a thing that slides is `translateY`. This property recalculates layout on every frame.";

/** Style properties whose animation forces a layout pass. */
const LAYOUT_PROPS = new Set([
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "top",
  "left",
  "right",
  "bottom",
  "start",
  "end",
  "flex",
  "flexBasis",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingStart",
  "paddingEnd",
  "paddingHorizontal",
  "paddingVertical",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginEnd",
  "marginHorizontal",
  "marginVertical",
  "gap",
  "rowGap",
  "columnGap",
]);

const styleKeyName = (property: AstNode): string | null => {
  if (property.type !== "Property") return null;
  const { key } = property;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return null;
};

export const gpuPropertiesOnly: Rule = problem(
  "Animate `transform` and `opacity` in `useAnimatedStyle` and `useAnimatedProps`. Layout properties such as `width` or `margin` recalculate layout every frame.",
  {
    createOnce(context: RuleContext) {
      let depth = 0;
      return {
        before() {
          depth = 0;
          return gate(context, "useAnimatedStyle", "useAnimatedProps");
        },
        CallExpression(node) {
          if (ANIMATED_STYLE_HOOKS.has(calleeName(node))) depth += 1;
        },
        "CallExpression:exit"(node) {
          if (ANIMATED_STYLE_HOOKS.has(calleeName(node))) depth -= 1;
        },
        Property(node) {
          if (depth === 0) return;
          if (node.parent.type !== "ObjectExpression") return;
          const name = styleKeyName(node);
          if (name !== null && LAYOUT_PROPS.has(name)) {
            context.report({ node, message: GPU_PROPERTIES_ONLY });
          }
        },
      };
    },
  }
);
