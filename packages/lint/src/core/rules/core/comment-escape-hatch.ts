import type { Rule } from "../../../lib/types.js";
import {
  BLOCK_COMMENT_TYPES,
  type Comment,
  type CommentContext,
  commentNode,
  ESCAPE_HATCH,
  reviewedComments,
} from "./shared.js";

const HATCH_MIN_FACT = 10;
const HATCH_MAX_LENGTH = 120;
const HATCH_DEFAULT_BUDGET = 2;

const HATCH_MESSAGES = {
  block:
    "Rewrite this as a single `// what: <fact>` line comment. If the fact needs a paragraph, name the pieces in code until it fits on one line.",
  multiline: `Fit this \`what:\` on one \`//\` line under ${HATCH_MAX_LENGTH} characters, and move whatever spills over into names in the code.`,
  shortFact: `Write the fact after \`what:\` (at least ${HATCH_MIN_FACT} characters), or delete the comment.`,
  tooLong: `Trim this \`what:\` line under ${HATCH_MAX_LENGTH} characters, moving what is left into names in the code.`,
  stacked:
    "Keep one `what:` line here — the single irreducible fact — and refactor what the others explain into named values and functions.",
};

const LINE_BREAK = /[\n\r]/;

const hatchFact = (body: string): string | undefined => body.match(ESCAPE_HATCH)?.groups?.fact;

const shapeViolation = (comment: Comment, body: string, fact: string): string | null => {
  if (BLOCK_COMMENT_TYPES.has(comment.type)) return HATCH_MESSAGES.block;
  if (LINE_BREAK.test(comment.value)) return HATCH_MESSAGES.multiline;
  if (fact.trim().length < HATCH_MIN_FACT) return HATCH_MESSAGES.shortFact;
  if (body.length > HATCH_MAX_LENGTH) return HATCH_MESSAGES.tooLong;
  return null;
};

const budgetOf = (context: CommentContext): number =>
  (context.options?.[0] as { budget?: number } | undefined)?.budget ?? HATCH_DEFAULT_BUDGET;

const sourceText = (context: CommentContext): string => context.sourceCode?.getText?.() ?? "";

const isStackedOn = (source: string, previous: Comment, comment: Comment): boolean =>
  source.slice(previous.end, comment.start).trim() === "";

const wellShapedHatches = (context: CommentContext): Comment[] => {
  const accepted: Comment[] = [];
  for (const { comment, body } of reviewedComments(context)) {
    const fact = hatchFact(body);
    if (fact === undefined) continue;
    const violation = shapeViolation(comment, body, fact);
    if (violation === null) accepted.push(comment);
    else context.report({ node: commentNode(comment), message: violation });
  }
  return accepted;
};

const reportStacked = (context: CommentContext, accepted: Comment[]): void => {
  const source = sourceText(context);
  for (const [index, comment] of accepted.entries()) {
    const previous = accepted[index - 1];
    if (previous && isStackedOn(source, previous, comment)) {
      context.report({ node: commentNode(comment), message: HATCH_MESSAGES.stacked });
    }
  }
};

const reportOverBudget = (context: CommentContext, accepted: Comment[]): void => {
  const budget = budgetOf(context);
  if (accepted.length <= budget) return;
  context.report({
    node: commentNode(accepted[budget] as Comment),
    message: `Delete \`what:\` comments from this file until at most ${budget} remain (it has ${accepted.length}): move the logic each one annotates into a function whose name carries what the comment says.`,
  });
};

export const commentEscapeHatch: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Checks each `// what:` comment for the allowed one-line shape and length, and reports the ones past the per-file budget.",
    },
    schema: [
      {
        type: "object",
        properties: { budget: { type: "integer", minimum: 0 } },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context: CommentContext) {
    return {
      "Program:exit"() {
        const accepted = wellShapedHatches(context);
        reportStacked(context, accepted);
        reportOverBudget(context, accepted);
      },
    };
  },
};
