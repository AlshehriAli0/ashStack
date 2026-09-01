import { attributeName, calleeName, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { ANIMATED_STYLE_HOOKS } from "./shared.js";

const NEEDS_ANIMATED_COMPONENT =
  "Render this with the matching `Animated.*` component so the animated style takes effect. On a plain element the style is applied once at mount and never updates, and nothing errors.";

const ANIMATED_COMPONENT_FACTORIES = new Set(["createAnimatedComponent", "withUnistyles", "withAnimated"]);

/** The tag name node of an element, whether handed the element or its opening tag. */
const elementName = (node: AstNode): AstNode | null => {
  if (node.type === "JSXElement") return node.openingElement.name;
  if (node.type === "JSXOpeningElement") return node.name;
  return null;
};

const jsxTagName = (node: AstNode): string | null => {
  const name = elementName(node);
  if (name?.type === "JSXIdentifier") return name.name;
  if (name?.type === "JSXMemberExpression") {
    const { object, property } = name;
    return `${object.type === "JSXIdentifier" ? object.name : undefined}.${property.name}`;
  }
  return null;
};

/** The identifiers a `style` prop value names, whether it holds one style or an array of them. */
const referencedStyleNames = (value: AstNode | null | undefined): string[] => {
  if (value?.type !== "JSXExpressionContainer") return [];
  const { expression } = value;
  if (expression.type === "Identifier") return [expression.name];
  if (expression.type !== "ArrayExpression") return [];
  return expression.elements.flatMap(element => (element?.type === "Identifier" ? [element.name] : []));
};

interface Candidate {
  node: AstNode;
  tag: string;
  referenced: string[];
}

export const animatedStyleNeedsAnimatedComponent: Rule = problem(
  "An animated style only takes effect on an `Animated.*` component. A plain element applies it once at mount and then never updates.",
  {
    createOnce(context: RuleContext) {
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
          if (node.type !== "VariableDeclarator") return;
          const { id, init } = node;
          if (id.type !== "Identifier") return;
          if (init?.type !== "CallExpression") return;
          const callee = calleeName(init);
          if (ANIMATED_STYLE_HOOKS.has(callee)) animatedStyles.add(id.name);
          else if (ANIMATED_COMPONENT_FACTORIES.has(callee)) animatedComponents.add(id.name);
        },
        ImportDeclaration(node) {
          if (node.type !== "ImportDeclaration") return;
          for (const specifier of node.specifiers) {
            const local = specifier.local.name;
            if (local.startsWith("Animated")) animatedComponents.add(local);
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
          if (node.type !== "JSXAttribute" || attributeName(node) !== "style") return;

          const tag = jsxTagName(node.parent);
          if (tag === null || tag.startsWith("Animated")) return;

          const referenced = referencedStyleNames(node.value);
          if (referenced.length === 0) return;
          candidates.push({ node, tag, referenced });
        },
      };
    },
  }
);
