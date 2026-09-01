import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const LAYOUT_ONLY_PROPS = new Set(["style"]);

const MERGEABLE_WRAPPERS = new Set(["View", "Animated.View"]);

/** `Animated.View` keeps its object here, unlike `tagIdentifier`. */
const fullTagName = (name: AstNode): string => {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type !== "JSXMemberExpression") return "";
  const object = fullTagName(name.object);
  const property = name.property.name;
  return object === "" || property === "" ? "" : `${object}.${property}`;
};

const elementChildren = (children: readonly AstNode[]): AstNode[] =>
  children.filter(child => child.type !== "JSXText" || child.value.trim() !== "");

const onlyLayoutProps = (attributes: readonly AstNode[]): boolean =>
  attributes.every(
    attribute =>
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      LAYOUT_ONLY_PROPS.has(attribute.name.name)
  );

export const noRedundantViewNesting: Rule = problem(
  "Bans a View or Animated.View that wraps an identical view when neither carries anything but a style. Every extra host view is a real node in the native tree.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXElement(node) {
          if (node.type !== "JSXElement") return;
          const opening = node.openingElement;
          const tag = fullTagName(opening.name);
          if (!MERGEABLE_WRAPPERS.has(tag)) return;
          if (!onlyLayoutProps(opening.attributes)) return;
          const children = elementChildren(node.children);
          if (children.length !== 1) return;
          const child = children[0];
          if (child?.type !== "JSXElement") return;
          const childOpening = child.openingElement;
          if (fullTagName(childOpening.name) !== tag) return;
          if (!onlyLayoutProps(childOpening.attributes)) return;
          context.report({
            node: opening.name,
            message: `Merge these two <${tag}> style objects into the inner one and delete the outer wrapper — each carries nothing but a style, and every extra host view is a real node in the native tree.`,
          });
        },
      };
    },
  }
);
