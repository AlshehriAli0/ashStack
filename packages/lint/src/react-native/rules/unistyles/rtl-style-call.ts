import { closestAncestor, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, memberPath, type GateContext } from "./shared.js";

const MESSAGE = "Read `rt.rtl` inside the dynamic style instead of passing `I18nManager.isRTL` in from JSX.";

export const rtlStyleCall: Rule = problem(
  "Disallow passing `I18nManager.isRTL` from JSX into a dynamic style function. Unistyles tracks the dependency itself once the style reads `rt.rtl`.",
  {
    createOnce(context: GateContext) {
      const sheets = new Set<string>();
      const candidates: { call: AstNode; receiver: string }[] = [];
      return {
        before() {
          sheets.clear();
          candidates.length = 0;
          return gate(context, CREATE_MARKER);
        },
        VariableDeclarator(node) {
          const id = node.id as AstNode | undefined;
          if (id?.type === "Identifier" && isStyleSheetCreate(node.init as AstNode | undefined)) {
            sheets.add(id.name as string);
          }
        },
        MemberExpression(node) {
          if (memberPath(node) !== "I18nManager.isRTL") return;
          const call = closestAncestor(node, new Set(["CallExpression"]));
          const callee = call?.callee as AstNode | undefined;
          if (!call || callee?.type !== "MemberExpression") return;
          const receiver = callee.object as AstNode | undefined;
          if (receiver?.type !== "Identifier") return;
          candidates.push({ call, receiver: receiver.name as string });
        },
        "Program:exit"() {
          for (const candidate of candidates) {
            if (!sheets.has(candidate.receiver)) continue;
            context.report({ node: candidate.call, message: MESSAGE });
          }
        },
      };
    },
  }
);
