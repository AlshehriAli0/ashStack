import { calleeName, gate, problem, propertyKeyName } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ANIMATED_STYLE_HOOKS } from "./shared.js";

const GPU_PROPERTIES_ONLY =
  "Animate `transform` and `opacity` instead — a panel that grows is `scaleY` with `transformOrigin`, a slide is `translateY`. This property relayouts every frame.";

const BOX_SHADOW =
  "Animate `boxShadow` instead, which renders on both platforms. `shadowOffset`, `shadowOpacity` and `shadowRadius` render on iOS only, and `elevation` on Android only.";

/** Shadow properties that each render on one platform only. `shadowColor` also tints Android's elevation shadow. */
const PLATFORM_SHADOW_PROPS = new Set(["shadowOffset", "shadowOpacity", "shadowRadius", "elevation"]);

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

/** The `width` and `height` inside a `shadowOffset` are not layout; the offset itself already reports. */
const isShadowOffset = (object: AstNode): boolean =>
  object.parent !== null && propertyKeyName(object.parent) === "shadowOffset";

export const gpuPropertiesOnly: Rule = problem(
  "Animate `transform` and `opacity` in `useAnimatedStyle` and `useAnimatedProps`, and `boxShadow` for a shadow. Layout properties such as `width` or `margin` recalculate layout every frame, and `shadowOffset`, `shadowOpacity`, `shadowRadius` and `elevation` each render on one platform only.",
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
          const { parent } = node;
          if (parent.type !== "ObjectExpression" || isShadowOffset(parent)) return;
          const name = propertyKeyName(node);
          if (LAYOUT_PROPS.has(name)) context.report({ node, message: GPU_PROPERTIES_ONLY });
          else if (PLATFORM_SHADOW_PROPS.has(name)) context.report({ node, message: BOX_SHADOW });
        },
      };
    },
  }
);
