import type { Rule, Visitor } from "../../../lib/types.js";
import {
  allComments,
  type Comment,
  commentBody,
  type CommentContext,
  commentNode,
  ESCAPE_HATCH,
  IGNORED_COMMENT_TYPES,
  isDirective,
} from "./shared.js";

const REFACTOR_FIRST =
  "Delete this comment and let the code say it: rename the value to state its own meaning, extract a named function, and flatten the control flow until it reads without prose. Keep exactly one `// what: <fact>` line only when the fact cannot live in code at all — a platform bug, an ordering constraint, a value measured outside this codebase.";

const eachComment = (
  context: CommentContext,
  visit: (comment: Comment, body: string, fact: string | undefined) => void
): Visitor => ({
  "Program:exit"() {
    const comments = allComments(context);
    if (comments.length === 0) return;
    for (const comment of comments) {
      if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
      const body = commentBody(comment);
      if (isDirective(body)) continue;
      visit(comment, body, body.match(ESCAPE_HATCH)?.groups?.fact);
    }
  },
});

export const noComments: Rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Reports every comment that is neither a `// what: <fact>` line nor a tooling directive.",
    },
    defaultOff: true,
  },
  createOnce(context: CommentContext) {
    return eachComment(context, (comment, _body, fact) => {
      if (fact === undefined) context.report({ node: commentNode(comment), message: REFACTOR_FIRST });
    });
  },
};
