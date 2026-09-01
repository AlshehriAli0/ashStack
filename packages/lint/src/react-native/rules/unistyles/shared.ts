import { calleeName, findInSubtree, gate, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext, Visitor } from "../../../lib/types.js";

/** oxlint's context, narrowed to the source text the `gate` helper reads. */
export type GateContext = RuleContext & { sourceCode?: { text?: string } };

export const CREATE_MARKER = "StyleSheet.create";

export const isStyleSheetCreate = (node: AstNode | null | undefined): boolean => {
  if (node === null || node === undefined || node.type !== "CallExpression") return false;
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== "MemberExpression") return false;
  const object = callee.object as AstNode | undefined;
  return (
    object?.type === "Identifier" &&
    object.name === "StyleSheet" &&
    (callee.property as AstNode | undefined)?.name === "create"
  );
};

export const propertyName = (node: AstNode): string => {
  const key = node.key as AstNode | undefined;
  if (!key) return "";
  if (key.type === "Identifier") return key.name as string;
  if (key.type === "Literal") return String(key.value);
  return "";
};

export const memberPath = (node: AstNode | null | undefined): string => {
  const parts: string[] = [];
  let current: AstNode | undefined = node ?? undefined;
  while (current?.type === "MemberExpression") {
    const property = current.property as AstNode | undefined;
    if (property?.type === "Identifier") parts.unshift(property.name as string);
    else if (property?.type === "Literal") parts.unshift(String(property.value));
    else parts.unshift("*");
    current = current.object as AstNode | undefined;
  }
  if (current?.type === "Identifier") parts.unshift(current.name as string);
  return parts.join(".");
};

const themeFunctionBody = (factory: AstNode): AstNode | undefined =>
  factory.type === "ArrowFunctionExpression" || factory.type === "FunctionExpression"
    ? (factory.body as AstNode | undefined)
    : undefined;

const objectReturnedFrom = (body: AstNode | undefined): AstNode | null => {
  if (body?.type === "ObjectExpression") return body;
  const expression = body?.expression as AstNode | undefined;
  if (body?.type === "ParenthesizedExpression" && expression?.type === "ObjectExpression") return expression;
  return findInSubtree(body, current => current.type === "ObjectExpression");
};

/** The styles object a `StyleSheet.create` argument holds: a literal, or the one its theme function returns. */
export const stylesObjectOf = (factory: AstNode | null | undefined): AstNode | null => {
  if (!factory) return null;
  if (factory.type === "ObjectExpression") return factory;
  const body = themeFunctionBody(factory);
  return body === undefined ? null : objectReturnedFrom(body);
};

export const declaresUseUnistylesTheme = (scope: AstNode): boolean =>
  subtreeHas(scope, current => {
    if (current.type !== "VariableDeclarator") return false;
    const id = current.id as AstNode | undefined;
    return (
      id?.type === "ObjectPattern" &&
      calleeName(current.init as AstNode | undefined) === "useUnistyles" &&
      ((id.properties as AstNode[] | undefined) ?? []).some(
        property => (property.key as AstNode | undefined)?.name === "theme"
      )
    );
  });

export const readsTheme = (node: AstNode): boolean =>
  subtreeHas(node, current => current.type === "MemberExpression" && memberPath(current).startsWith("theme."));

/**
 * Builds a rule whose visitors only fire inside `StyleSheet.create(...)`, by tracking how deeply
 * nested the traversal currently is in such a call. The depth resets per file in `before()`, which
 * also runs the text gate.
 */
export const inCreate = (description: string, visit: (context: GateContext, inside: () => boolean) => Visitor): Rule =>
  problem(description, {
    createOnce(context: GateContext) {
      let createDepth = 0;
      const inside = () => createDepth > 0;
      const visitors = visit(context, inside);
      const enter: ((node: AstNode) => void) | undefined = visitors.CallExpression;
      const exit: ((node: AstNode) => void) | undefined = visitors["CallExpression:exit"];
      return {
        ...visitors,
        before() {
          createDepth = 0;
          return gate(context, CREATE_MARKER);
        },
        CallExpression(node) {
          if (isStyleSheetCreate(node)) createDepth += 1;
          enter?.(node);
        },
        "CallExpression:exit"(node) {
          exit?.(node);
          if (isStyleSheetCreate(node)) createDepth -= 1;
        },
      };
    },
  });
