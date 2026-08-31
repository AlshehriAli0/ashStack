// Only a bare `interpolate(...)` call, so an unrelated `something.interpolate()`
// on another object is not mistaken for Reanimated's.
import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { GateContext } from "./shared.js";

const INTERPOLATE_NEEDS_CLAMP =
  "Pass `Extrapolation.CLAMP` as the fourth argument to `interpolate`. Without it the output keeps extrapolating past the input range, so a scroll offset of 400 against `[0, 100]` runs well past where it should stop.";

export const interpolateNeedsClamp: Rule = problem(
  "Give `interpolate()` an explicit `Extrapolation.CLAMP` fourth argument. Without it the output keeps going past the ends of the input range.",
  {
    createOnce(context: GateContext) {
      return {
        before() {
          return gate(context, "interpolate");
        },
        CallExpression(node) {
          const callee = node.callee as AstNode | undefined;
          if (callee?.type !== "Identifier" || callee.name !== "interpolate") return;
          const args = (node.arguments as AstNode[] | undefined) ?? [];
          if (args.length !== 3) return;
          if (args.some(argument => argument?.type === "SpreadElement")) return;
          context.report({ node, message: INTERPOLATE_NEEDS_CLAMP });
        },
      };
    },
  }
);
