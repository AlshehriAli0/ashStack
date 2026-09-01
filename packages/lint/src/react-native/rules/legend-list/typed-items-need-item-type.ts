import { gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { attributeNamed, expressionOf, hasSpread, isListElement, LIST, type ListElement } from "./shared.js";

const branchesOnItemType = (node: AstNode): boolean =>
  subtreeHas(
    node,
    current =>
      current.type === "MemberExpression" && current.property.type === "Identifier" && current.property.name === "type"
  );

export const typedItemsNeedItemType: Rule = problem(
  "Require `getItemType` when a row branches on `item.type`. Without it every layout shares one recycling pool and one size average.",
  {
    createOnce(context) {
      let rowRenderersByName: Map<string, AstNode>;
      let listsWithoutItemType: { node: ListElement; renderItem: AstNode }[];

      const reportMissingItemTypeAtEndOfFile = (): void => {
        for (const { node, renderItem } of listsWithoutItemType) {
          const expression = expressionOf(renderItem);
          const body = expression?.type === "Identifier" ? rowRenderersByName.get(expression.name) : expression;
          if (body === undefined || body === null || !branchesOnItemType(body)) continue;

          context.report({
            node: node.openingElement,
            message:
              "Add `getItemType={item => item.type}` to match the branch this row makes on `item.type`. It gives each layout its own recycling pool and its own measured-size average, instead of handing a header's view to a photo row.",
          });
        }
      };

      return {
        before() {
          rowRenderersByName = new Map();
          listsWithoutItemType = [];
          return gate(context, LIST);
        },
        FunctionDeclaration(node) {
          if (node.id?.type === "Identifier") rowRenderersByName.set(node.id.name, node);
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type !== "Identifier" || init === null) return;
          rowRenderersByName.set(id.name, init);
        },
        JSXElement(node) {
          if (!isListElement(node) || hasSpread(node)) return;
          if (attributeNamed(node, "getItemType")) return;

          const renderItem = attributeNamed(node, "renderItem");
          if (!renderItem) return;
          listsWithoutItemType.push({ node, renderItem });
        },
        "Program:exit": reportMissingItemTypeAtEndOfFile,
      };
    },
  }
);
