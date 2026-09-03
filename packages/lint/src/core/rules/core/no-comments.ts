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

const MARKER = /^(?<kind>what|why):\s*(?<fact>[\s\S]+)$/i;
const BLOCK_COMMENT_TYPES = new Set(["Block", "MultiLine"]);
const IGNORED_COMMENT_TYPES = new Set(["Shebang", "Hashbang"]);

const HATCH_MIN_FACT = 10;
const HATCH_MAX_LENGTH = 120;
const HATCH_DEFAULT_BUDGET = 2;

const REFACTOR_MOVES =
  "Make the code say this, then delete the line — rename, Extract Function, Guard Clause, or named steps. Done when the sentence reads off a name or the control flow.";

const HATCH_OPEN =
  " `// what:` fits only a fact that outlives the code — a platform bug, an upstream contract, a measured number; what the code does is not one, and still owes the refactor.";

const HATCH_CLOSED =
  " This project runs with the `// what:` hatch turned off. The one line left is `// why:`, which a kept `memo` requires.";

const refactorFirst = (escapeHatch: boolean): string => REFACTOR_MOVES + (escapeHatch ? HATCH_OPEN : HATCH_CLOSED);

const FLOATING_JSDOC =
  "Attach this block to the declaration it documents, or Rename and Extract Function until the code reads without it.";

const HATCH_MESSAGES = {
  block:
    "Rewrite this as a single `// what: <fact>` line comment; if the fact needs a paragraph, name the pieces in code instead.",
  shortFact: `Write the fact after \`what:\` (at least ${HATCH_MIN_FACT} characters), or delete the comment.`,
  tooLong: `Trim this \`what:\` line under ${HATCH_MAX_LENGTH} characters, moving what is left into names in the code.`,
  stacked: "Keep one `what:` line here and refactor what the others explain into names.",
};

const overBudget = (budget: number, count: number): string =>
  `Delete \`what:\` comments from this file until at most ${budget} remain (it has ${count}): move each one's logic into a function named for it.`;

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
  "TSIndexSignature",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSAbstractMethodDefinition",
  "TSAbstractPropertyDefinition",
  "AccessorProperty",
  "ImportDeclaration",
]);

const commentBody = (comment: Comment): string =>
  (BLOCK_COMMENT_TYPES.has(comment.type) ? comment.value.replace(/^[*\s]+/, "") : comment.value).trim();

const isDirective = (body: string): boolean => COMMENT_DIRECTIVES.some(prefix => body.startsWith(prefix));

const isJsdoc = (comment: Comment): boolean => BLOCK_COMMENT_TYPES.has(comment.type) && comment.value.startsWith("*");

/** Comments this rule judges: shebangs and tooling directives are none of its business. */
const reviewedComments = (context: RuleContext): Reviewed[] => {
  const reviewed: Reviewed[] = [];
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

interface Reviewed {
  comment: Comment;
  body: string;
}

interface Marker extends Reviewed {
  kind: "what" | "why";
  fact: string;
}

/**
 * `what:` states a durable fact and spends the file's prose budget. `why:` is
 * the marker `@ashstack/react-native/no-manual-memo` requires above a kept
 * `memo`: not discretionary prose, so it is held to the same one-line shape and
 * left out of the budget, and it survives `escapeHatch: false`.
 */
const markerIn = (reviewed: Reviewed, escapeHatch: boolean): Marker[] => {
  const groups = MARKER.exec(reviewed.body)?.groups;
  if (!groups?.kind || !groups.fact) return [];
  const kind = groups.kind.toLowerCase() === "why" ? "why" : "what";
  if (kind === "what" && !escapeHatch) return [];
  return [{ ...reviewed, kind, fact: groups.fact }];
};

const shapeViolation = (comment: Comment, body: string, fact: string): string | null => {
  if (BLOCK_COMMENT_TYPES.has(comment.type)) return HATCH_MESSAGES.block;
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
        'Disallow every comment that is neither a `// what: <fact>` line, a `// why:` marker, nor a tooling directive. The message names the refactoring that removes it: Rename, Extract Function, Guard Clause. Surviving `// what:` lines are held to one short line each, at most `budget` per file (default 2); `escapeHatch: false` removes that hatch, so no discretionary prose survives. A `// why:` line is the marker `@ashstack/react-native/no-manual-memo` requires above a kept `memo`: held to the same one-line shape, never counted against `budget`, and kept even with `escapeHatch: false`, so the two rules run together. With `jsdoc: "allow"`, a `/** */` block documenting the declaration directly beneath it is kept, while a floating one still reports.',
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

    const reportProse = (reviewed: Reviewed[], options: Options) => {
      const { text } = context.sourceCode;
      const escapeHatch = hatchAllowed(options);
      for (const entry of reviewed) {
        const { comment } = entry;
        if (markerIn(entry, escapeHatch).length > 0) continue;
        if (options.jsdoc !== "allow" || !isJsdoc(comment)) report(comment, refactorFirst(escapeHatch));
        else if (!declarationStarts.has(nextTokenStart(text, comment.end))) report(comment, FLOATING_JSDOC);
      }
    };

    const wellShapedMarkers = (reviewed: Reviewed[], escapeHatch: boolean): Marker[] => {
      const accepted: Marker[] = [];
      for (const entry of reviewed) {
        for (const marker of markerIn(entry, escapeHatch)) {
          const violation = shapeViolation(marker.comment, marker.body, marker.fact);
          if (violation === null) accepted.push(marker);
          else report(marker.comment, violation);
        }
      }
      return accepted;
    };

    const reportStacked = (accepted: Marker[]) => {
      const source = context.sourceCode.getText();
      const comments = accepted.map(marker => marker.comment);
      for (const [index, comment] of comments.entries()) {
        const previous = comments[index - 1];
        if (previous && isStackedOn(source, previous, comment)) report(comment, HATCH_MESSAGES.stacked);
      }
    };

    const reportOverBudget = (accepted: Marker[], options: Options) => {
      const budget = options.budget ?? HATCH_DEFAULT_BUDGET;
      const hatches = accepted.filter(marker => marker.kind === "what");
      const overflow = hatches[budget];
      if (overflow) report(overflow.comment, overBudget(budget, hatches.length));
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
        const accepted = wellShapedMarkers(reviewed, hatchAllowed(options));
        reportStacked(accepted);
        reportOverBudget(accepted, options);
      },
    };
  },
};
