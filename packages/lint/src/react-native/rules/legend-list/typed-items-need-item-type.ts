// renderItem is usually a hoisted function declared elsewhere in the file, so
// the row bodies are indexed first and the check runs at the end.
import { gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { attributeNamed, expressionOf, hasSpread, isListElement, LIST, type GateContext } from "./shared.js";

const branchesOnItemType = (node: AstNode): boolean =>
  subtreeHas(
    node,
    current => current.type === "MemberExpression" && (current.property as AstNode | undefined)?.name === "type"
  );

export const typedItemsNeedItemType: Rule = problem(
  "Require `getItemType` when a row branches on `item.type`. Without it every layout shares one recycling pool and one size average.",
  {
    createOnce(context: GateContext) {
      let rowRenderers: Map<string, AstNode>;
      let pending: { node: AstNode; renderItem: AstNode }[];

      return {
        before() {
          rowRenderers = new Map();
          pending = [];
          return gate(context, LIST);
        },
        FunctionDeclaration(node) {
          const id = node.id as AstNode | undefined;
          if (id?.type === "Identifier") rowRenderers.set(id.name as string, node);
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type !== "Identifier" || init === null || init === undefined) return;
          rowRenderers.set(id.name as string, init);
        },
        JSXElement(node) {
          if (!isListElement(node) || hasSpread(node)) return;
          if (attributeNamed(node, "getItemType")) return;

          const renderItem = attributeNamed(node, "renderItem");
          if (!renderItem) return;
          pending.push({ node, renderItem });
        },
        "Program:exit"() {
          for (const { node, renderItem } of pending) {
            const expression = expressionOf(renderItem);
            const body = expression?.type === "Identifier" ? rowRenderers.get(expression.name as string) : expression;
            if (body === undefined || body === null || !branchesOnItemType(body)) continue;

            context.report({
              node: node.openingElement as AstNode,
              message:
                "Add `getItemType={item => item.type}` to match the branch this row makes on `item.type`. It gives each layout its own recycling pool and its own measured-size average, instead of handing a header's view to a photo row.",
            });
          }
        },
      };
    },
  }
);
