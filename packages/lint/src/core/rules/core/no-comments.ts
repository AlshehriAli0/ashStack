import type { AstNode, Rule, Visitor } from "../../../lib/types.js";
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

const REFACTOR_FIRST =
  "Make the code say this, then delete the line — nearly every comment here is one rename or one refactor away from unnecessary. Reach for the move that fits: Rename the value, function or type to the plain word this sentence uses; Extract Function for the block it summarises, named after the claim it makes; Guard Clause for the nesting it walks the reader through; split the clever expression it decodes into named steps. You are done when the sentence's content is legible in an identifier, a signature or the control flow. The `// what:` hatch carries one kind of fact: one that outlives this code — a platform bug, an upstream contract, a number measured on a device. A fact about what this code does fails that test, and the refactor is still owed.";

const FLOATING_JSDOC =
  "Attach this block to the declaration it documents, or Rename and Extract Function until the code reads without it. A `/** */` block earns its place as documentation of the symbol directly beneath it.";

const DECLARATION_TYPES = new Set([
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
  "FunctionDeclaration",
  "VariableDeclaration",
  "ClassDeclaration",
  "MethodDefinition",
  "PropertyDefinition",
  "Property",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSEnumDeclaration",
  "TSEnumMember",
  "TSModuleDeclaration",
  "TSDeclareFunction",
  "TSPropertySignature",
  "TSMethodSignature",
  "ImportDeclaration",
]);

const isJsdoc = (comment: Comment): boolean => BLOCK_COMMENT_TYPES.has(comment.type) && comment.value.startsWith("*");

/** offset of the first non-whitespace character at or after `from` */
const nextTokenStart = (text: string, from: number): number => {
  let index = from;
  while (index < text.length && /\s/.test(text[index] as string)) index += 1;
  return index;
};

const violationFor = (
  comment: Comment,
  allowJsdoc: boolean,
  documentsNextDeclaration: (comment: Comment) => boolean
): string | null => {
  if (IGNORED_COMMENT_TYPES.has(comment.type)) return null;

  const body = commentBody(comment);
  if (isDirective(body) || ESCAPE_HATCH.test(body)) return null;
  if (!allowJsdoc || !isJsdoc(comment)) return REFACTOR_FIRST;
  return documentsNextDeclaration(comment) ? null : FLOATING_JSDOC;
};

export const noComments: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Reports every comment that is neither a `// what: <fact>` line nor a tooling directive. The message names the refactoring that removes it — Rename, Extract Function, Guard Clause — and holds the `// what:` hatch to facts that outlive the code, such as a platform bug or a measured number. With `jsdoc: "allow"`, a `/** */` block documenting the declaration directly beneath it is kept, while a floating one still reports.',
    },
    schema: [
      {
        type: "object",
        properties: { jsdoc: { enum: ["allow", "report"] } },
        additionalProperties: false,
      },
    ],
    defaultOff: true,
  },
  createOnce(context: CommentContext) {
    const declarationStarts = new Set<number>();
    const record = (node: AstNode) => {
      declarationStarts.add(node.start as number);
    };

    const visitors: Visitor = {};
    for (const type of DECLARATION_TYPES) visitors[type] = record;

    return {
      ...visitors,
      before() {
        declarationStarts.clear();
        return true;
      },
      "Program:exit"() {
        const allowJsdoc = (context.options?.[0] as { jsdoc?: string } | undefined)?.jsdoc === "allow";
        const text = context.sourceCode?.text ?? "";
        const documentsNextDeclaration = (comment: Comment) => declarationStarts.has(nextTokenStart(text, comment.end));

        for (const comment of allComments(context)) {
          const message = violationFor(comment, allowJsdoc, documentsNextDeclaration);
          if (message) context.report({ node: commentNode(comment), message });
        }
      },
    };
  },
};
