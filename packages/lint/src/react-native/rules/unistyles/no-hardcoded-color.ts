import type { Rule } from "../../../lib/types.js";
import { inCreate } from "./shared.js";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

const MESSAGE =
  "Use a `theme.colors` token for this value — a raw color bypasses dark mode and never shifts with the theme. If no token fits, add one to the theme.";

export const noHardcodedColor: Rule = inCreate(
  "Disallow hex and CSS-function colors inside `StyleSheet.create`. A raw color skips dark mode and never changes with the theme.",
  (context, inside) => ({
    Literal(node) {
      if (!inside()) return;
      if (typeof node.value !== "string") return;
      if (!HEX_COLOR.test(node.value) && !CSS_COLOR_FUNCTION.test(node.value)) return;
      context.report({ node, message: MESSAGE });
    },
  })
);
