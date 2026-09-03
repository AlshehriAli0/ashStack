import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const MISSING =
  "Pass `Extrapolation.CLAMP` as the fourth argument to `interpolate`, or the output keeps extrapolating past the input range.";

const NOT_CLAMPING =
  "Change this fourth argument to `Extrapolation.CLAMP` — `EXTEND` and `IDENTITY` keep extrapolating past the input range.";

const NON_CLAMPING = new Set(["EXTEND", "IDENTITY", "extend", "identity"]);

/** An extrapolation this rule can see is not clamping. An opaque one — a variable, a call — reports nothing. */
const isNonClamping = (node: AstNode): boolean => {
  if (node.type === "Literal") return typeof node.value === "string" && NON_CLAMPING.has(node.value);
  if (node.type === "Identifier") return NON_CLAMPING.has(node.name);
  if (node.type === "MemberExpression") {
    return node.property.type === "Identifier" && NON_CLAMPING.has(node.property.name);
  }
  if (node.type === "ObjectExpression") {
    return node.properties.some(property => property.type === "Property" && isNonClamping(property.value));
  }
  return false;
};

export const interpolateNeedsClamp: Rule = problem(
  "Give `interpolate()` a fourth argument that clamps. Without one, or with `EXTEND` or `IDENTITY`, the output keeps going past the ends of the input range.",
  {
    createOnce(context: RuleContext) {
      return {
        before() {
          return gate(context, "interpolate");
        },
        CallExpression(node) {
          const { callee, arguments: args } = node;
          if (callee.type !== "Identifier" || callee.name !== "interpolate") return;
          if (args.length < 3 || args.length > 4) return;
          if (args.some(argument => argument.type === "SpreadElement")) return;

          const extrapolation = args[3];
          if (extrapolation === undefined) context.report({ node, message: MISSING });
          else if (isNonClamping(extrapolation)) context.report({ node: extrapolation, message: NOT_CLAMPING });
        },
      };
    },
  }
);
