import type { AstNode, RuleContext } from "../../../lib/types.js";

/** oxlint's comment token — not an AST node, but reportable as one. */
export interface Comment {
  type: string;
  value: string;
  start: number;
  end: number;
}

export type CommentContext = RuleContext & {
  sourceCode?: {
    text?: string;
    getText?: (node?: AstNode) => string;
    getAllComments?: () => Comment[];
  };
};

export const COMMENT_DIRECTIVES = [
  "@ts-expect-error",
  "@ts-ignore",
  "@ts-nocheck",
  "@ts-check",
  "@jsx",
  "@jsxRuntime",
  "@jsxImportSource",
  "prettier-ignore",
  "eslint-disable",
  "eslint-enable",
  "oxlint-disable",
  "oxlint-enable",
  "oxfmt-ignore",
  "react-doctor-disable",
  "@type",
  "<reference",
  "#__PURE__",
  "@__PURE__",
  "v8 ignore",
  "c8 ignore",
  "istanbul ignore",
  "@vitest-environment",
  "EXPECT_PASS",
  "EXPECT_FAIL",
];

export const ESCAPE_HATCH = /^what:\s*(?<fact>.+)$/i;
export const BLOCK_COMMENT_TYPES = new Set(["Block", "MultiLine"]);
export const IGNORED_COMMENT_TYPES = new Set(["Shebang", "Hashbang"]);

export const commentBody = (comment: Comment): string =>
  (BLOCK_COMMENT_TYPES.has(comment.type) ? comment.value.replace(/^[*\s]+/, "") : comment.value).trim();

export const isDirective = (body: string): boolean => COMMENT_DIRECTIVES.some(prefix => body.startsWith(prefix));

export const allComments = (context: CommentContext): Comment[] => context.sourceCode?.getAllComments?.() ?? [];

export const commentNode = (comment: Comment): AstNode => comment as unknown as AstNode;

export interface ReviewedComment {
  comment: Comment;
  body: string;
}

/**
 * The one filtered list every comment rule judges: each comment in the file
 * except shebangs and tooling directives, paired with its body text stripped of
 * `//`, `/*` and leading `*` decoration. The rules share this walk and disagree
 * only about what they report from it.
 */
export const reviewedComments = (context: CommentContext): ReviewedComment[] => {
  const reviewed: ReviewedComment[] = [];
  for (const comment of allComments(context)) {
    if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
    const body = commentBody(comment);
    if (isDirective(body)) continue;
    reviewed.push({ comment, body });
  }
  return reviewed;
};
