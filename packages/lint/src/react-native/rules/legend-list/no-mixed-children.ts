import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { attributeNamed, isListElement, LIST, type GateContext } from "./shared.js";

const rendersRealChild = (node: AstNode): boolean =>
  ((node.children as AstNode[] | undefined) ?? []).some(
    child =>
      child.type === "JSXElement" ||
      child.type === "JSXFragment" ||
      (child.type === "JSXText" && (child.value as string).trim() !== "") ||
      (child.type === "JSXExpressionContainer" &&
        (child.expression as AstNode | undefined)?.type !== "JSXEmptyExpression")
  );

export const noMixedChildren: Rule = problem(
  "Disallow passing both `data` and real children to a Legend List. The combination is unsupported and one of the two is dropped without a warning.",
  {
    createOnce: (context: GateContext) => ({
      before: () => gate(context, LIST),
      JSXElement(node) {
        if (!isListElement(node)) return;
        if (!attributeNamed(node, "data")) return;
        if (!rendersRealChild(node)) return;

        context.report({
          node: node.openingElement as AstNode,
          message:
            "Keep either `data` with `renderItem` or children mode here, and remove the other. Passing both fails silently, with no guarantee about which one is ignored.",
        });
      },
    }),
  }
);
