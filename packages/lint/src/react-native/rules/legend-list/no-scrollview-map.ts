import { gate, problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { type GateContext } from "./shared.js";

export const noScrollviewMap: Rule = problem(
  "A `ScrollView` mounts every child up front, so a mapped collection does not belong in its children.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, "ScrollView"),
      JSXElement(node) {
        if (tagIdentifier((node.openingElement as AstNode | undefined)?.name as AstNode | undefined) !== "ScrollView") {
          return;
        }

        for (const child of (node.children as AstNode[] | undefined) ?? []) {
          if (child.type !== "JSXExpressionContainer") continue;
          const call = child.expression as AstNode | undefined;
          if (call?.type !== "CallExpression") continue;
          const callee = call.callee as AstNode | undefined;
          if (callee?.type !== "MemberExpression" || (callee.property as AstNode | undefined)?.name !== "map") continue;

          context.report({
            node: child,
            message:
              "Render this collection with `LegendList` from '@legendapp/list/react-native', passing the array as `data` and the mapped body as `renderItem`. A ScrollView mounts every child up front, so 200 rows cost 200 mounts to show ten.",
          });
          return;
        }
      },
    }),
  }
);
