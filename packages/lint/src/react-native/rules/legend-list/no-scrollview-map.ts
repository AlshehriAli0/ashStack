import { componentName, gate, problem } from "../../../lib/ast.js";
import type { Rule } from "../../../lib/types.js";

export const noScrollviewMap: Rule = problem(
  "A `ScrollView` mounts every child up front, so a mapped collection does not belong in its children.",
  {
    createOnce: context => ({
      before: () => gate(context, "ScrollView"),
      JSXElement(node) {
        if (componentName(node.openingElement.name) !== "ScrollView") return;

        for (const child of node.children) {
          if (child.type !== "JSXExpressionContainer") continue;
          const call = child.expression;
          if (call.type !== "CallExpression") continue;
          const { callee } = call;
          if (callee.type !== "MemberExpression") continue;
          if (callee.property.type !== "Identifier" || callee.property.name !== "map") continue;

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
