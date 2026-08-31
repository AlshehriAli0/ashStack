import { attributeName, calleeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { ANIMATED_STYLE_HOOKS, type GateContext } from "./shared.js";

const NEEDS_ANIMATED_COMPONENT =
  "Render this with the matching `Animated.*` component so the animated style takes effect. On a plain element the style is applied once at mount and never updates, and nothing errors.";

const ANIMATED_COMPONENT_FACTORIES = new Set(["createAnimatedComponent", "withUnistyles", "withAnimated"]);

const jsxTagName = (node: AstNode | undefined): string | null => {
  const name = ((node?.openingElement as AstNode | undefined)?.name ?? node?.name) as AstNode | undefined;
  if (name?.type === "JSXIdentifier") return name.name as string;
  if (name?.type === "JSXMemberExpression") {
    const object = name.object as AstNode | undefined;
    const property = name.property as AstNode | undefined;
    return `${object?.name as string}.${property?.name as string}`;
  }
  return null;
};

interface Candidate {
  node: AstNode;
  tag: string;
  referenced: string[];
}

export const animatedStyleNeedsAnimatedComponent: Rule = problem(
  "An animated style only takes effect on an `Animated.*` component. A plain element applies it once at mount and then never updates.",
  {
    createOnce(context: GateContext) {
      let animatedStyles = new Set<string>();
      let animatedComponents = new Set<string>();
      let candidates: Candidate[] = [];
      return {
        before() {
          animatedStyles = new Set();
          animatedComponents = new Set();
          candidates = [];
          return gate(context, "useAnimatedStyle", "useAnimatedProps");
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type !== "Identifier") return;
          if (init?.type !== "CallExpression") return;
          const callee = calleeName(init);
          if (ANIMATED_STYLE_HOOKS.has(callee)) animatedStyles.add(id.name as string);
          else if (ANIMATED_COMPONENT_FACTORIES.has(callee)) animatedComponents.add(id.name as string);
        },
        ImportDeclaration(node) {
          for (const specifier of (node.specifiers as AstNode[] | undefined) ?? []) {
            const local = (specifier.local as AstNode | undefined)?.name as string | undefined;
            if (local !== undefined && local.startsWith("Animated")) animatedComponents.add(local);
          }
        },
        "Program:exit"() {
          if (animatedStyles.size === 0) return;
          for (const { node, tag, referenced } of candidates) {
            if (animatedComponents.has(tag)) continue;
            if (!referenced.some(name => animatedStyles.has(name))) continue;
            context.report({ node, message: NEEDS_ANIMATED_COMPONENT });
          }
        },
        JSXAttribute(node) {
          if (attributeName(node) !== "style") return;

          const tag = jsxTagName(node.parent ?? undefined);
          if (tag === null || tag.startsWith("Animated")) return;

          const value = node.value as AstNode | undefined;
          const expression =
            value?.type === "JSXExpressionContainer" ? (value.expression as AstNode | undefined) : null;
          const referenced =
            expression?.type === "Identifier"
              ? [expression.name as string]
              : expression?.type === "ArrayExpression"
                ? ((expression.elements as AstNode[] | undefined) ?? [])
                    .filter(element => element?.type === "Identifier")
                    .map(element => element.name as string)
                : [];
          if (referenced.length === 0) return;
          candidates.push({ node, tag, referenced });
        },
      };
    },
  }
);
