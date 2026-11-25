import { attributeName, gate, importedNames, problem } from "../../../lib/ast.js";
import type { Rule, RuleContext } from "../../../lib/types.js";

const LAYOUT_ANIMATION_PROPS = new Set(["entering", "exiting", "layout"]);

/** The React Native components Reanimated ships an `Animated.*` version of. */
const ANIMATED_BUILT_INS = new Set(["View", "Text", "Image", "ScrollView", "FlatList"]);

const fixFor = (component: string): string =>
  ANIMATED_BUILT_INS.has(component)
    ? `Render this as \`Animated.${component}\``
    : `Render \`createAnimatedComponent(${component})\`, created once at module scope`;

export const layoutAnimationNeedsAnimatedComponent: Rule = problem(
  "Disallow `entering`, `exiting` or `layout` on a component imported from `react-native`. Only an `Animated.*` component or a `createAnimatedComponent` wrapper runs a layout animation; a plain one ignores the prop.",
  {
    createOnce(context: RuleContext) {
      const hostComponents = new Map<string, string>();
      return {
        before() {
          hostComponents.clear();
          return gate(context, "entering", "exiting", "layout");
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedNames(node, "react-native")) hostComponents.set(local, imported);
        },
        JSXAttribute(node) {
          const prop = attributeName(node);
          if (!LAYOUT_ANIMATION_PROPS.has(prop) || node.parent.type !== "JSXOpeningElement") return;
          const { name } = node.parent;
          const component = name.type === "JSXIdentifier" ? hostComponents.get(name.name) : undefined;
          if (component === undefined) return;
          context.report({
            node,
            message: `${fixFor(component)}. A plain \`${component}\` ignores \`${prop}\`, so nothing animates.`,
          });
        },
      };
    },
  }
);
