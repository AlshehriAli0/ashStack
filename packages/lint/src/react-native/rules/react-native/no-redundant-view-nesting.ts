import { problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";
import { asNode, asNodes } from "./shared.js";

const LAYOUT_ONLY_PROPS = new Set(["style"]);

const MERGEABLE_WRAPPERS = new Set(["View", "Animated.View"]);

/** `Animated.View` keeps its object here, unlike `tagIdentifier`. */
const fullTagName = (name: AstNode | undefined): string => {
  if (name?.type === "JSXIdentifier") return name.name as string;
  if (name?.type !== "JSXMemberExpression") return "";
  const object = fullTagName(asNode(name.object));
  const property = (asNode(name.property)?.name as string | undefined) ?? "";
  return object === "" || property === "" ? "" : `${object}.${property}`;
};

const elementChildren = (node: AstNode): AstNode[] =>
  asNodes(node.children).filter(child => child.type !== "JSXText" || ((child.value as string) ?? "").trim() !== "");

const onlyLayoutProps = (opening: AstNode | undefined): boolean =>
  asNodes(opening?.attributes).every(
    attribute =>
      attribute.type === "JSXAttribute" && LAYOUT_ONLY_PROPS.has((asNode(attribute.name)?.name as string) ?? "")
  );

export const noRedundantViewNesting: Rule = problem(
  "Bans a View or Animated.View that wraps an identical view when neither carries anything but a style. Every extra host view is a real node in the native tree.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXElement(node) {
          const opening = asNode(node.openingElement);
          const tag = fullTagName(asNode(opening?.name));
          if (!MERGEABLE_WRAPPERS.has(tag)) return;
          if (!onlyLayoutProps(opening)) return;
          const children = elementChildren(node);
          if (children.length !== 1) return;
          const child = children[0];
          if (child?.type !== "JSXElement") return;
          const childOpening = asNode(child.openingElement);
          if (fullTagName(asNode(childOpening?.name)) !== tag) return;
          if (!onlyLayoutProps(childOpening)) return;
          context.report({
            node: asNode(opening?.name) as AstNode,
            message: `Merge these two <${tag}> style objects into the inner one and delete the outer wrapper — each carries nothing but a style, and every extra host view is a real node in the native tree.`,
          });
        },
      };
    },
  }
);
