import type { Rule } from "../../../lib/types.js";
import {
  allComments,
  BLOCK_COMMENT_TYPES,
  type Comment,
  commentBody,
  type CommentContext,
  commentNode,
  ESCAPE_HATCH,
  IGNORED_COMMENT_TYPES,
  isDirective,
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
        const comments = allComments(context);
        if (comments.length === 0) return;

        const budget = (context.options?.[0] as { budget?: number } | undefined)?.budget ?? HATCH_DEFAULT_BUDGET;
        const source = context.sourceCode?.getText?.() ?? "";
        const accepted: Comment[] = [];

        for (const comment of comments) {
          if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
          const body = commentBody(comment);
          if (isDirective(body)) continue;

          const fact = body.match(ESCAPE_HATCH)?.groups?.fact;
          if (fact === undefined) continue;

          if (BLOCK_COMMENT_TYPES.has(comment.type)) {
            context.report({ node: commentNode(comment), message: HATCH_MESSAGES.block });
          } else if (/[\n\r]/.test(comment.value)) {
            context.report({ node: commentNode(comment), message: HATCH_MESSAGES.multiline });
          } else if (fact.trim().length < HATCH_MIN_FACT) {
            context.report({ node: commentNode(comment), message: HATCH_MESSAGES.shortFact });
          } else if (body.length > HATCH_MAX_LENGTH) {
            context.report({ node: commentNode(comment), message: HATCH_MESSAGES.tooLong });
          } else {
            accepted.push(comment);
          }
        }

        for (const [index, comment] of accepted.entries()) {
          const previous = accepted[index - 1];
          if (previous && source.slice(previous.end, comment.start).trim() === "") {
            context.report({ node: commentNode(comment), message: HATCH_MESSAGES.stacked });
          }
        }

        if (accepted.length > budget) {
          context.report({
            node: commentNode(accepted[budget] as Comment),
            message: `Delete \`what:\` comments from this file until at most ${budget} remain (it has ${accepted.length}): move the logic each one annotates into a function whose name carries what the comment says.`,
          });
        }
      },
    };
  },
};
