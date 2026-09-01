import { closestAncestor, gate, problem } from "../../../lib/ast.js";
import type { AstNode, Rule } from "../../../lib/types.js";
import { CREATE_MARKER, isStyleSheetCreate, memberPath } from "./shared.js";

const MESSAGE = "Read `rt.rtl` inside the dynamic style instead of passing `I18nManager.isRTL` in from JSX.";

export const rtlStyleCall: Rule = problem(
  "Disallow passing `I18nManager.isRTL` from JSX into a dynamic style function. Unistyles tracks the dependency itself once the style reads `rt.rtl`.",
  {
    createOnce(context) {
      const sheets = new Set<string>();
      const candidates: { call: AstNode; receiver: string }[] = [];
      return {
        before() {
          sheets.clear();
          candidates.length = 0;
          return gate(context, CREATE_MARKER);
        },
        VariableDeclarator(node) {
          const { id, init } = node;
          if (id.type === "Identifier" && isStyleSheetCreate(init)) sheets.add(id.name);
        },
        MemberExpression(node) {
          if (memberPath(node) !== "I18nManager.isRTL") return;
          const call = closestAncestor(node, new Set(["CallExpression"]));
          if (call?.type !== "CallExpression") return;
          const { callee } = call;
          if (callee.type !== "MemberExpression") return;
          const receiver = callee.object;
          if (receiver.type !== "Identifier") return;
          candidates.push({ call, receiver: receiver.name });
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
