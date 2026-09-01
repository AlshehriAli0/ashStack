import { optionsOf } from "../../../lib/ast.js";
import type { AstNode, Rule, RuleContext, Visitor } from "../../../lib/types.js";

/** oxlint's comment token — not an AST node, but reportable as one. */
type Comment = ReturnType<RuleContext["sourceCode"]["getAllComments"]>[number];

const COMMENT_DIRECTIVES = [
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

const ESCAPE_HATCH = /^what:\s*(?<fact>.+)$/i;
const BLOCK_COMMENT_TYPES = new Set(["Block", "MultiLine"]);
const IGNORED_COMMENT_TYPES = new Set(["Shebang", "Hashbang"]);
const LINE_BREAK = /[\n\r]/;

const HATCH_MIN_FACT = 10;
const HATCH_MAX_LENGTH = 120;
const HATCH_DEFAULT_BUDGET = 2;

const REFACTOR_MOVES =
  "Make the code say this, then delete the line — nearly every comment here is one rename or one refactor away from unnecessary. Reach for the move that fits: Rename the value, function or type to the plain word this sentence uses; Extract Function for the block it summarises, named after the claim it makes; Guard Clause for the nesting it walks the reader through; split the clever expression it decodes into named steps. You are done when the sentence's content is legible in an identifier, a signature or the control flow.";

const HATCH_OPEN =
  " The `// what:` hatch carries one kind of fact: one that outlives this code — a platform bug, an upstream contract, a number measured on a device. A fact about what this code does fails that test, and the refactor is still owed.";

const HATCH_CLOSED =
  " This project runs with the `// what:` hatch turned off, so the refactor is the only way out: there is no fact this file may state in prose.";

const refactorFirst = (escapeHatch: boolean): string => REFACTOR_MOVES + (escapeHatch ? HATCH_OPEN : HATCH_CLOSED);

const FLOATING_JSDOC =
  "Attach this block to the declaration it documents, or Rename and Extract Function until the code reads without it. A `/** */` block earns its place as documentation of the symbol directly beneath it.";

const HATCH_MESSAGES = {
  block:
    "Rewrite this as a single `// what: <fact>` line comment. If the fact needs a paragraph, name the pieces in code until it fits on one line.",
  multiline: `Fit this \`what:\` on one \`//\` line under ${HATCH_MAX_LENGTH} characters, and move whatever spills over into names in the code.`,
  shortFact: `Write the fact after \`what:\` (at least ${HATCH_MIN_FACT} characters), or delete the comment.`,
  tooLong: `Trim this \`what:\` line under ${HATCH_MAX_LENGTH} characters, moving what is left into names in the code.`,
  stacked:
    "Keep one `what:` line here — the single irreducible fact — and refactor what the others explain into named values and functions.",
};

const overBudget = (budget: number, count: number): string =>
  `Delete \`what:\` comments from this file until at most ${budget} remain (it has ${count}): move the logic each one annotates into a function whose name carries what the comment says.`;

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

const commentBody = (comment: Comment): string =>
  (BLOCK_COMMENT_TYPES.has(comment.type) ? comment.value.replace(/^[*\s]+/, "") : comment.value).trim();

const isDirective = (body: string): boolean => COMMENT_DIRECTIVES.some(prefix => body.startsWith(prefix));

const isJsdoc = (comment: Comment): boolean => BLOCK_COMMENT_TYPES.has(comment.type) && comment.value.startsWith("*");

/** Comments this rule judges: shebangs and tooling directives are none of its business. */
const reviewedComments = (context: RuleContext): { comment: Comment; body: string }[] => {
  const reviewed: { comment: Comment; body: string }[] = [];
  for (const comment of context.sourceCode.getAllComments()) {
    if (IGNORED_COMMENT_TYPES.has(comment.type)) continue;
    const body = commentBody(comment);
    if (isDirective(body)) continue;
    reviewed.push({ comment, body });
  }
  return reviewed;
};

/** offset of the first non-whitespace character at or after `from` */
const nextTokenStart = (text: string, from: number): number => {
  let index = from;
  while (/\s/.test(text.charAt(index))) index += 1;
  return index;
};

const shapeViolation = (comment: Comment, body: string, fact: string): string | null => {
  if (BLOCK_COMMENT_TYPES.has(comment.type)) return HATCH_MESSAGES.block;
  if (LINE_BREAK.test(comment.value)) return HATCH_MESSAGES.multiline;
  if (fact.trim().length < HATCH_MIN_FACT) return HATCH_MESSAGES.shortFact;
  if (body.length > HATCH_MAX_LENGTH) return HATCH_MESSAGES.tooLong;
  return null;
};

const isStackedOn = (source: string, previous: Comment, comment: Comment): boolean =>
  source.slice(previous.end, comment.start).trim() === "";

interface Options {
  jsdoc?: "allow" | "report";
  escapeHatch?: boolean;
  budget?: number;
}

const hatchAllowed = (options: Options): boolean => options.escapeHatch !== false;

export const noComments: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Reports every comment that is neither a `// what: <fact>` line nor a tooling directive. The message names the refactoring that removes it — Rename, Extract Function, Guard Clause. Surviving `// what:` lines are held to one short line each, at most `budget` per file (default 2); `escapeHatch: false` removes the hatch entirely, so no prose survives at all. With `jsdoc: "allow"`, a `/** */` block documenting the declaration directly beneath it is kept, while a floating one still reports.',
    },
    schema: [
      {
        type: "object",
        properties: {
          jsdoc: { enum: ["allow", "report"] },
          escapeHatch: { type: "boolean" },
          budget: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    defaultOff: true,
  },
  createOnce(context: RuleContext) {
    const declarationStarts = new Set<number>();
    const recordDeclaration = (node: AstNode) => {
      declarationStarts.add(node.start);
    };

    const declarationVisitors: Visitor = {};
    for (const type of DECLARATION_TYPES) declarationVisitors[type] = recordDeclaration;

    const report = (comment: Comment, message: string) => {
      context.report({ node: comment, message });
    };

    const reportProse = (reviewed: { comment: Comment; body: string }[], options: Options) => {
      const { text } = context.sourceCode;
      const escapeHatch = hatchAllowed(options);
      for (const { comment, body } of reviewed) {
        if (escapeHatch && ESCAPE_HATCH.test(body)) continue;
        if (options.jsdoc !== "allow" || !isJsdoc(comment)) report(comment, refactorFirst(escapeHatch));
        else if (!declarationStarts.has(nextTokenStart(text, comment.end))) report(comment, FLOATING_JSDOC);
      }
    };

    const wellShapedHatches = (reviewed: { comment: Comment; body: string }[]): Comment[] => {
      const accepted: Comment[] = [];
      for (const { comment, body } of reviewed) {
        const fact = body.match(ESCAPE_HATCH)?.groups?.fact;
        if (fact === undefined) continue;
        const violation = shapeViolation(comment, body, fact);
        if (violation === null) accepted.push(comment);
        else report(comment, violation);
      }
      return accepted;
    };

    const reportStacked = (accepted: Comment[]) => {
      const source = context.sourceCode.getText();
      for (const [index, comment] of accepted.entries()) {
        const previous = accepted[index - 1];
        if (previous && isStackedOn(source, previous, comment)) report(comment, HATCH_MESSAGES.stacked);
      }
    };

    const reportOverBudget = (accepted: Comment[], options: Options) => {
      const budget = options.budget ?? HATCH_DEFAULT_BUDGET;
      const overflow = accepted[budget];
      if (overflow) report(overflow, overBudget(budget, accepted.length));
    };

    return {
      ...declarationVisitors,
      before() {
        declarationStarts.clear();
        return true;
      },
      "Program:exit"() {
        const options = optionsOf<Options>(context, {});
        const reviewed = reviewedComments(context);
        reportProse(reviewed, options);
        if (!hatchAllowed(options)) return;
        const accepted = wellShapedHatches(reviewed);
        reportStacked(accepted);
        reportOverBudget(accepted, options);
      },
    };
  },
};
