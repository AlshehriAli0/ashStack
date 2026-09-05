import { isMemberCall, receiverName } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext } from "../../../lib/types.js";

const DEFAULT_MAX = 300;

/** Receivers whose `.create` call holds a style table: React Native and Unistyles `StyleSheet`, StyleX `stylex`. */
const STYLE_RECEIVERS = new Set(["StyleSheet", "stylex"]);

const NEWLINE = 10;
/** Every character above a space is content; every one at or below it is whitespace. */
const SPACE = 32;

type Range = readonly [start: number, end: number];

const isStyleTable = (node: AstNode): boolean =>
  isMemberCall(node, "create") && STYLE_RECEIVERS.has(receiverName(node) ?? "");

/**
 * Lines holding a character of their own: not blank, and not left blank once
 * the excluded ranges are taken out. Those ranges mask the source rather than
 * rewrite it, so the whole count is one pass and one buffer.
 */
const countedLines = (text: string, excluded: Range[]): number => {
  const skipped = new Uint8Array(text.length);
  for (const [start, end] of excluded) skipped.fill(1, start, end);

  let counted = 0;
  let onCode = false;
  for (let index = 0; index < text.length; index++) {
    const character = text.charCodeAt(index);
    if (character === NEWLINE) {
      if (onCode) counted++;
      onCode = false;
    } else if (character > SPACE && skipped[index] === 0) onCode = true;
  }
  return onCode ? counted + 1 : counted;
};

export const maxLines: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cap the lines of code in one file, counting neither blank lines, comments, nor the style tables `StyleSheet.create` and `stylex.create` build. A stylesheet is data, and keeping it next to the component it styles is the point — it should not spend the budget that logic spends. The option says how many lines: 300 by default, which `core()` keeps, and 250 from `react()` down, where a file past it is several components rather than one long one. Replaces the built-in `max-lines`, which counts every line of all three.",
    },
    schema: [{ type: "integer", minimum: 1 }],
  },
  createOnce(context: RuleContext) {
    let styles: Range[] = [];

    return {
      before() {
        styles = [];
        return true;
      },
      CallExpression(node) {
        if (isStyleTable(node)) styles.push([node.start, node.end]);
      },
      "Program:exit"(program) {
        const last = program.body.at(-1);
        if (!last) return;

        const max = typeof context.options[0] === "number" ? context.options[0] : DEFAULT_MAX;
        const comments = context.sourceCode.getAllComments().map((comment): Range => [comment.start, comment.end]);
        const counted = countedLines(context.sourceCode.getText(), [...styles, ...comments]);
        if (counted <= max) return;

        context.report({
          node: last,
          message: `Move part of this file elsewhere — ${counted} counted lines, past ${max}. Blank lines, comments and style tables are already excluded.`,
        });
      },
    };
  },
};
