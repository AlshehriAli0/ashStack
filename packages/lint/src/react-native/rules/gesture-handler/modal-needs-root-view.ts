import { ancestors, findInSubtree, gate, importedNames, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const RNGH = "react-native-gesture-handler";

const ROOT_VIEW = "GestureHandlerRootView";

const MODAL_NEEDS_ROOT_VIEW = `Wrap this \`Modal\`'s content in \`${ROOT_VIEW}\` with \`style={{ flex: 1 }}\`. A \`Modal\` renders outside the app's root view, so the gestures inside it never fire without one.`;

const opens = (names: ReadonlySet<string>, element: AstNode): boolean =>
  element.type === "JSXElement" &&
  element.openingElement.name.type === "JSXIdentifier" &&
  names.has(element.openingElement.name.name);

export const modalNeedsRootView: Rule = problem(
  "Require a `GestureHandlerRootView` around every Gesture Handler component inside a React Native `Modal`. A `Modal` renders outside the app's root view, so those gestures never fire without one.",
  {
    createOnce(context: RuleContext) {
      const modals = new Set<string>();
      const gestures = new Set<string>();
      const roots = new Set<string>();

      /** Whether `element` has a root view between it and `modal`. */
      const underRoot = (element: AstNode, modal: AstNode): boolean => {
        for (const current of ancestors(element)) {
          if (current === modal) return false;
          if (opens(roots, current)) return true;
        }
        return false;
      };

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
          const { value } = node.source;
          if (value !== RNGH && !value.startsWith(`${RNGH}/`)) return;
          for (const specifier of node.specifiers) gestures.add(specifier.local.name);
          for (const { imported, local } of importedNames(node, value)) {
            if (imported !== ROOT_VIEW) continue;
            gestures.delete(local);
            roots.add(local);
          }
        },
        JSXElement(node) {
          if (!opens(modals, node)) return;
          const bare = findInSubtree(node.children, child => opens(gestures, child) && !underRoot(child, node));
          if (bare !== null) context.report({ node: node.openingElement.name, message: MODAL_NEEDS_ROOT_VIEW });
        },
      };
    },
  }
);
