import { problem, tagIdentifier } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const BARE_JSX_TEXT =
  'Wrap this text in `t("<key>")`, or `<Trans>` when it holds markup, and add the key to every locale file.';

const I18N_COMPONENTS = new Set(["Trans", "Plural", "Select"]);
const BARE_TEXT = /^[A-Za-z][^<{}]{2,}$/;

export const noBareText: Rule = problem(
  "Fires when a JSX element carries no attributes and its single child is plain literal text.",
  {
    createOnce(context: RuleContext) {
      return {
        JSXElement(node: AstNode) {
          if (node.type !== "JSXElement") return;
          const opening = node.openingElement;
          if (opening.attributes.length > 0) return;
          const children = node.children.filter(child => child.type !== "JSXText" || child.value.trim() !== "");
          if (children.length !== 1) return;
          const [only] = children;
          if (only.type !== "JSXText") return;
          if (!BARE_TEXT.test(only.value.trim())) return;
          if (I18N_COMPONENTS.has(tagIdentifier(opening.name))) return;
          context.report({ node: only, message: BARE_JSX_TEXT });
        },
      };
    },
  }
);
