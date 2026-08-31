import { calleeName, enclosingCall, gate, importedSpecifiers, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import type { GateContext } from "./shared.js";

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

export const noReactStateFromContinuousWorklet: Rule = problem(
  "A worklet that runs every frame must not send a React state setter through `scheduleOnRN`. That puts a Fabric commit on an animation frame.",
  {
    createOnce(context: GateContext) {
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
            const imported = specifier.imported as AstNode | undefined;
            if (specifier.type === "ImportSpecifier" && imported?.name === "useState") useStateFromReact = true;
          }
          for (const specifier of importedSpecifiers(node, "react-native-worklets")) {
            const imported = specifier.imported as AstNode | undefined;
            if (specifier.type === "ImportSpecifier" && imported?.name === "scheduleOnRN") scheduleFromWorklets = true;
          }
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          const init = node.init as AstNode | undefined;
          if (id?.type !== "ArrayPattern") return;
          if (init?.type !== "CallExpression" || (init.callee as AstNode | undefined)?.name !== "useState") return;
          const setter = ((id.elements as AstNode[] | undefined) ?? [])[1];
          if (setter?.type === "Identifier") setters.add(setter.name as string);
        },
        CallExpression(node) {
          if (calleeName(node) !== "scheduleOnRN") return;
          const target = ((node.arguments as AstNode[] | undefined) ?? [])[0];
          if (target?.type !== "Identifier") return;
          if (!enclosingCall(node, CONTINUOUS_HOOKS)) return;
          pending.push({ node, name: target.name as string });
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
