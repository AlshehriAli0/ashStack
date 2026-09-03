import { gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, stylesObjectOf } from "./shared.js";

const MESSAGE =
  "Drop the `() =>` and keep the object. A style function is for a value the use site passes in; `theme` and `rt` reach a static style already.";

/** A style value written as a function, which is only a dynamic function when it takes something. */
const paramlessFunction = (node: AstNode | null | undefined): AstNode | null => {
  if (node?.type !== "ArrowFunctionExpression" && node?.type !== "FunctionExpression") return null;
  return node.params.length === 0 ? node : null;
};

/**
 * The object a `() => ({ ... })` returns, which is the only shape an unwrap reaches by
 * deleting text. A block body may declare or branch on its way to the object, so that
 * rewrite is left to the reader.
 */
const unwrappableObject = (node: AstNode): AstNode | null => {
  if (node.type !== "ArrowFunctionExpression") return null;
  return node.body.type === "ObjectExpression" ? node.body : null;
};

const reportParamlessStyle = (context: RuleContext, property: AstNode): void => {
  if (property.type !== "Property") return;
  const style = paramlessFunction(property.value);
  if (style === null) return;
  const object = unwrappableObject(style);
  context.report({
    node: style,
    message: MESSAGE,
    suggest:
      object === null
        ? []
        : [
            {
              desc: "Unwrap into a static style object",
              fix: fixer => fixer.replaceText(style, context.sourceCode.getText(object)),
            },
          ],
  });
};

export const noParamlessDynamicFunction: Rule = problem(
  "Disallow a style written as a function that takes no arguments. It returns the same object on every render, and `theme` and `rt` reach a static style anyway, so the function only adds a call at each use site. The suggestion turns `() => ({ ... })` back into the object.",
  {
    meta: { hasSuggestions: true },
    createOnce(context) {
      return {
        before: () => gate(context, CREATE_MARKER),
        CallExpression(node) {
          if (!isStyleSheetCreate(node)) return;
          const styles = stylesObjectOf(node.arguments[0]);
          if (styles === null) return;
          for (const property of styles.properties) reportParamlessStyle(context, property);
        },
      };
    },
  }
);
