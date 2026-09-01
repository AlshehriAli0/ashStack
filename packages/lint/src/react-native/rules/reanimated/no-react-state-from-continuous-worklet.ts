import { calleeName, enclosingCall, gate, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const CONTINUOUS_WORKLET_STATE =
  "Keep this gate in shared or native state, or apply it through an imperative ref. A continuously evaluated worklet that schedules React state can land a Fabric commit or a Skia re-recording on an animation frame.";

/** Hooks whose callback is re-evaluated as the animation runs. */
const CONTINUOUS_HOOKS = new Set([
  "useAnimatedReaction",
  "useFrameCallback",
  "useDerivedValue",
  "useAnimatedStyle",
  "useAnimatedProps",
  "useAnimatedScrollHandler",
]);

/** True for `import { name } from ...` — a named import, not a default or namespace one. */
const importsName = (specifier: AstNode, name: string): boolean =>
  specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier" && specifier.imported.name === name;

export const noReactStateFromContinuousWorklet: Rule = problem(
  "A worklet that runs every frame must not send a React state setter through `scheduleOnRN`. That puts a Fabric commit on an animation frame.",
  {
    createOnce(context: RuleContext) {
      const setters = new Set<string>();
      const pending: { node: AstNode; name: string }[] = [];
      let useStateFromReact = false;
      let scheduleFromWorklets = false;
      return {
        before() {
          setters.clear();
          pending.length = 0;
          useStateFromReact = false;
          scheduleFromWorklets = false;
          return gate(context, "scheduleOnRN");
        },
        ImportDeclaration(node) {
          for (const specifier of importedSpecifiers(node, "react")) {
            if (importsName(specifier, "useState")) useStateFromReact = true;
          }
          for (const specifier of importedSpecifiers(node, "react-native-worklets")) {
            if (importsName(specifier, "scheduleOnRN")) scheduleFromWorklets = true;
          }
        },
        VariableDeclarator(node) {
          if (node.type !== "VariableDeclarator") return;
          const { id, init } = node;
          if (id.type !== "ArrayPattern") return;
          if (init?.type !== "CallExpression") return;
          if (init.callee.type !== "Identifier" || init.callee.name !== "useState") return;
          const setter = id.elements[1];
          if (setter?.type === "Identifier") setters.add(setter.name);
        },
        CallExpression(node) {
          if (node.type !== "CallExpression" || calleeName(node) !== "scheduleOnRN") return;
          const target = node.arguments[0];
          if (target?.type !== "Identifier") return;
          if (!enclosingCall(node, CONTINUOUS_HOOKS)) return;
          pending.push({ node, name: target.name });
        },
        "Program:exit"() {
          if (!useStateFromReact || !scheduleFromWorklets) return;
          for (const entry of pending) {
            if (!setters.has(entry.name)) continue;
            context.report({ node: entry.node, message: CONTINUOUS_WORKLET_STATE });
          }
        },
      };
    },
  }
);
