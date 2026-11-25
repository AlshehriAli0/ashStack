import { gate, importedNames, problem, subtreeHas } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const RNGH = "react-native-gesture-handler";

/** Gesture Handler components that only respond under a `GestureHandlerRootView`. */
const GESTURE_COMPONENTS = new Set([
  "GestureDetector",
  "VirtualGestureDetector",
  "InterceptingGestureDetector",
  "Touchable",
  "Pressable",
]);

const MODAL_NEEDS_ROOT_VIEW =
  "Wrap this `Modal`'s content in `GestureHandlerRootView` with `style={{ flex: 1 }}`. A `Modal` renders outside the app's root view, so the gestures inside it never fire without one.";

const opens = (names: ReadonlySet<string>) => (node: AstNode) =>
  node.type === "JSXOpeningElement" && node.name.type === "JSXIdentifier" && names.has(node.name.name);

export const modalNeedsRootView: Rule = problem(
  "Require a `GestureHandlerRootView` inside a React Native `Modal` whose content uses a `GestureDetector` or a Gesture Handler `Touchable` or `Pressable`. A `Modal` renders outside the app's root view, so those gestures never fire without one.",
  {
    createOnce(context: RuleContext) {
      const modals = new Set<string>();
      const gestures = new Set<string>();
      const roots = new Set<string>();
      return {
        before() {
          modals.clear();
          gestures.clear();
          roots.clear();
          return gate(context, "Modal");
        },
        ImportDeclaration(node) {
          for (const { imported, local } of importedNames(node, "react-native")) {
            if (imported === "Modal") modals.add(local);
          }
          for (const { imported, local } of importedNames(node, RNGH)) {
            if (GESTURE_COMPONENTS.has(imported)) gestures.add(local);
            if (imported === "GestureHandlerRootView") roots.add(local);
          }
        },
        JSXElement(node) {
          if (!opens(modals)(node.openingElement)) return;
          if (!subtreeHas(node.children, opens(gestures)) || subtreeHas(node.children, opens(roots))) return;
          context.report({ node: node.openingElement.name, message: MODAL_NEEDS_ROOT_VIEW });
        },
      };
    },
  }
);
