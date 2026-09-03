import { join } from "node:path";

import core from "../packages/lint/dist/core/rules/core/index.js";
import { moduleTests } from "./harness.js";

const hatchOfBodyLength = (length: number): string => `// what: ${"x".repeat(length - 6)}`;

const DESIGN_SYSTEM_FILE = "../../designsys/pressable.tsx";
const NOT_EXEMPT = ["no-fragment-matches-this"];
const ABSOLUTE_DESIGN_SYSTEM = join(
  import.meta.dir,
  "..",
  "packages",
  "lint",
  "fixtures",
  "core",
  "use-design-system",
  "ds"
);

moduleTests(core, {
  "no-comments": {
    valid: [
      {
        name: "a file with no comments at all",
        code: `import { useState } from "react";

export const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
`,
      },
      {
        name: "typescript directive comment",
        code: `// @ts-expect-error the upstream types are wrong
export const value: string = 1 as unknown as string;
`,
      },
      {
        name: "block directive after the leading asterisks are stripped",
        code: `/** @type {import("oxlint").Config} */
export const config = {};
`,
      },
      {
        name: "oxlint directive comment",
        code: `// oxlint-disable-next-line typescript/no-explicit-any
export const parse = (input: any) => input;
`,
      },
      {
        name: "coverage directive comment",
        code: `/* istanbul ignore next */
export const unreachable = () => {
  throw new Error("unreachable");
};
`,
      },
      {
        name: "hashbang is not a comment this rule judges",
        code: `#!/usr/bin/env bun
export const main = () => 0;
`,
      },
      {
        name: "what: fact of exactly the minimum length",
        code: `// what: iOS 17 bug
export const inset = 1;
`,
      },
      {
        name: "what: body of exactly the maximum length",
        code: `${hatchOfBodyLength(120)}
export const inset = 1;
`,
      },
      {
        name: "what: matches case-insensitively",
        code: `// WHAT: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
      },
      {
        name: "what: tolerates extra space after the colon",
        code: `// what:    Android 14 rejects a zero-length payload here
export const payload = [0];
`,
      },
      {
        name: "two separated hatches sit exactly on the default budget",
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;
`,
      },
      {
        name: "three hatches under a raised budget",
        options: { budget: 3 },
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;

// what: iOS 17 reports a stale safe-area inset for one frame
export const insetFrames = 1;
`,
      },
      {
        name: "a why: marker survives on its own",
        code: `// why: rendered per list row, so the compiler cannot hoist it
export const Row = 1;
`,
      },
      {
        name: "four why: markers ignore the budget the hatches obey",
        code: `// why: rendered per list row, so the compiler cannot hoist it
export const A = 1;

// why: rendered per list row, so the compiler cannot hoist it
export const B = 2;

// why: rendered per list row, so the compiler cannot hoist it
export const C = 3;

// why: rendered per list row, so the compiler cannot hoist it
export const D = 4;
`,
      },
      {
        name: "why: markers alongside hatches spending the whole budget",
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;

// why: rendered per list row, so the compiler cannot hoist it
export const A = 1;

// why: rendered per list row, so the compiler cannot hoist it
export const B = 2;
`,
      },
      {
        name: "a why: marker outlives escapeHatch false",
        options: { escapeHatch: false },
        code: `// why: rendered per list row, so the compiler cannot hoist it
export const Row = 1;
`,
      },
      {
        name: "a why: marker outlives a budget of zero",
        options: { budget: 0 },
        code: `// why: rendered per list row, so the compiler cannot hoist it
export const Row = 1;
`,
      },
      {
        name: "WHY: is matched case-insensitively like what:",
        code: `// WHY: rendered per list row, so the compiler cannot hoist it
export const Row = 1;
`,
      },
      {
        name: "budget of zero with no hatches at all",
        options: { budget: 0 },
        code: `export const retryWindowMs = 30_000;
`,
      },
      {
        name: "empty options object behaves like the defaults",
        options: {},
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
      },
      {
        name: "escapeHatch true explicitly keeps the hatch open",
        options: { escapeHatch: true },
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
      },
      {
        name: "jsdoc allow keeps blocks attached to value declarations",
        options: { jsdoc: "allow" },
        code: `/** The client every request goes through. */
import { client } from "./client";

/** Formats a price for display. */
export const formatPrice = (value: number) => String(value);

/** How long a retry waits. */
const retryWindowMs = 30_000;

/** Renders nothing. */
export default function Empty() {
  return null;
}

/** The exported client. */
export { client as apiClient };
`,
      },
      {
        name: "jsdoc allow keeps blocks attached to type declarations",
        options: { jsdoc: "allow" },
        code: `/** Props for the price row. */
export interface PriceProps {
  /** The amount in minor units. */
  amount: number;
  /** Formats the amount. */
  format(): string;
}

/** A theme name. */
export type Theme = "light" | "dark";

/** Request lifecycle. */
export enum Status {
  /** Nothing has started. */
  Idle,
}

/** Ambient helper. */
declare function ambient(): void;

/** Ambient module. */
declare module "untyped-package";
`,
      },
      {
        name: "jsdoc allow keeps blocks attached to class members and object properties",
        options: { jsdoc: "allow" },
        code: `/** A cache of formatters. */
export class FormatterCache {
  /** The backing map. */
  private entries = new Map<string, string>();

  /** Reads one entry. */
  get(locale: string) {
    return this.entries.get(locale);
  }
}

export const handlers = {
  /** Called once the request settles. */
  onSettled: () => undefined,
};
`,
      },
    ],
    invalid: [
      {
        name: "a line comment explaining the code",
        code: `export const total = (items: number[]) => {
  // add up every line item
  return items.reduce((sum, item) => sum + item, 0);
};
`,
        errors: [{ message: "Make the code say this, then delete the line", line: 2, column: 3 }],
      },
      {
        name: "the default message offers the open hatch",
        code: `// keeps the tests honest
export const flag = true;
`,
        errors: [{ message: "still owes the refactor", line: 1, column: 1 }],
      },
      {
        name: "a plain block comment",
        code: `/* the vendor ships this as a string */
export const version = "1.0.0";
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "a trailing comment reports at its own column",
        code: `export const retryWindowMs = 30_000; // thirty seconds
`,
        errors: [{ message: "Make the code say this", line: 1, column: 38 }],
      },
      {
        name: "an empty comment is still prose",
        code: `//
export const flag = true;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "a jsdoc block reports like prose when jsdoc is not allowed",
        code: `/** Formats a price for display. */
export const formatPrice = (value: number) => String(value);
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "jsdoc report is the explicit form of the default",
        options: { jsdoc: "report" },
        code: `/** Formats a price for display. */
export const formatPrice = (value: number) => String(value);
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "jsdoc allow still reports a block floating above a statement",
        options: { jsdoc: "allow" },
        code: `/** Warms the cache. */
warmCache();

export const ready = true;
`,
        errors: [{ message: "Attach this block to the declaration it documents", line: 1, column: 1 }],
      },
      {
        name: "jsdoc allow still reports a block with nothing after it",
        options: { jsdoc: "allow" },
        code: `export const ready = true;

/** Everything above is the public surface. */
`,
        errors: [{ message: "Rename and Extract Function until the code reads without it", line: 3, column: 1 }],
      },
      {
        name: "jsdoc allow reports a block separated from its declaration by another comment",
        options: { jsdoc: "allow" },
        code: `/** Formats a price for display. */
// still deciding on the currency
export const formatPrice = (value: number) => String(value);
`,
        errors: [
          { message: "Attach this block to the declaration it documents", line: 1, column: 1 },
          { message: "Make the code say this", line: 2, column: 1 },
        ],
      },
      {
        name: "jsdoc allow does not cover non-jsdoc blocks or line comments",
        options: { jsdoc: "allow" },
        code: `/* the vendor ships this as a string */
export const version = "1.0.0";
// and this one is major only
export const major = 1;
`,
        errors: [
          { message: "Make the code say this", line: 1, column: 1 },
          { message: "Make the code say this", line: 3, column: 1 },
        ],
      },
      {
        name: "what: with no fact after the colon is prose",
        code: `// what:
export const flag = true;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "what without a colon is prose",
        code: `// what the vendor does with an empty payload
export const payload = [0];
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "what: not at the start of the comment is prose",
        code: `// note what: the vendor caps the retry window
export const retryWindowMs = 30_000;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "a near-miss directive prefix is prose",
        code: `// disable-eslint for the line below
export const flag = true;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "what: fact one character under the minimum",
        code: `// what: iOS17 bug
export const inset = 1;
`,
        errors: [{ message: "Write the fact after `what:` (at least 10 characters)", line: 1, column: 1 }],
      },
      {
        name: "what: body one character over the maximum",
        code: `${hatchOfBodyLength(121)}
export const inset = 1;
`,
        errors: [{ message: "Trim this `what:` line under 120 characters", line: 1, column: 1 }],
      },
      {
        name: "a what: fact in a block comment",
        code: `/* what: Android 14 rejects a zero-length payload here */
export const payload = [0];
`,
        errors: [{ message: "Rewrite this as a single `// what: <fact>` line comment", line: 1, column: 1 }],
      },
      {
        name: "a what: fact in a jsdoc block is still the wrong shape when jsdoc is allowed",
        options: { jsdoc: "allow" },
        code: `/**
 * what: Android 14 rejects a zero-length payload here
 */
export const payload = [0];
`,
        errors: [{ message: "Rewrite this as a single `// what: <fact>` line comment", line: 1, column: 1 }],
      },
      {
        name: "two stacked hatches report only the second",
        code: `// what: Android 14 rejects a zero-length payload here
// what: the vendor SDK caps the retry window at 30 seconds
export const payload = [0];
`,
        errors: [{ message: "Keep one `what:` line here", line: 2, column: 1 }],
      },
      {
        name: "a hatch stacked under a trailing hatch counts as stacked",
        code: `export const payload = [0]; // what: Android 14 rejects a zero-length payload
// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;
`,
        errors: [{ message: "Keep one `what:` line here", line: 2, column: 1 }],
      },
      {
        name: "three stacked hatches report twice for stacking and once for the budget",
        code: `// what: Android 14 rejects a zero-length payload here
// what: the vendor SDK caps the retry window at 30 seconds
// what: iOS 17 reports a stale safe-area inset for one frame
export const payload = [0];
`,
        errors: [
          { message: "Keep one `what:` line here", line: 2, column: 1 },
          { message: "Keep one `what:` line here", line: 3, column: 1 },
          { message: "at most 2 remain (it has 3)", line: 3, column: 1 },
        ],
      },
      {
        name: "three separated hatches report once on the third",
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;

// what: iOS 17 reports a stale safe-area inset for one frame
export const insetFrames = 1;
`,
        errors: [{ message: "at most 2 remain (it has 3)", line: 7, column: 1 }],
      },
      {
        name: "four separated hatches still report once, on the third",
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;

// what: iOS 17 reports a stale safe-area inset for one frame
export const insetFrames = 1;

// what: the emulator reports a device pixel ratio of zero on boot
export const bootPixelRatio = 0;
`,
        errors: [{ message: "at most 2 remain (it has 4)", line: 7, column: 1 }],
      },
      {
        name: "a malformed hatch never counts against the budget",
        code: `// what: short
export const payload = [0];

// what: Android 14 rejects a zero-length payload here
export const retryWindowMs = 30_000;

// what: iOS 17 reports a stale safe-area inset for one frame
export const insetFrames = 1;
`,
        errors: [{ message: "Write the fact after `what:`", line: 1, column: 1 }],
      },
      {
        name: "budget zero rejects the very first hatch",
        options: { budget: 0 },
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
        errors: [{ message: "at most 0 remain (it has 1)", line: 1, column: 1 }],
      },
      {
        name: "budget one rejects the second hatch",
        options: { budget: 1 },
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// what: the vendor SDK caps the retry window at 30 seconds
export const retryWindowMs = 30_000;
`,
        errors: [{ message: "at most 1 remain (it has 2)", line: 4, column: 1 }],
      },
      {
        name: "a why: marker is held to the same one-line shape as a hatch",
        code: `// why: short
export const Row = 1;
`,
        errors: [{ message: "Write the fact after" }],
      },
      {
        name: "a block why: marker must become a line comment",
        code: `/* why: rendered per list row, so the compiler cannot hoist it */
export const Row = 1;
`,
        errors: [{ message: "Rewrite this as a single `// what: <fact>` line comment" }],
      },
      {
        name: "a why: marker stacked on a hatch still reports the stack",
        code: `// what: iOS 17 reports a stale safe-area inset for one frame
// why: rendered per list row, so the compiler cannot hoist it
export const Row = 1;
`,
        errors: [{ message: "Keep one `what:` line here" }],
      },
      {
        name: "whying is prose, not a marker",
        code: `// whying about this later
export const Row = 1;
`,
        errors: 1,
      },
      {
        name: "escapeHatch false reports a well-shaped hatch with the closed message",
        options: { escapeHatch: false },
        code: `// what: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
        errors: [{ message: "The one line left is `// why:`", line: 1, column: 1 }],
      },
      {
        name: "escapeHatch false skips the shape check instead of reporting twice",
        options: { escapeHatch: false },
        code: `/* what: short */
export const payload = [0];
`,
        errors: [{ message: "hatch turned off", line: 1, column: 1 }],
      },
      {
        name: "escapeHatch false alongside jsdoc allow and a budget",
        options: { escapeHatch: false, jsdoc: "allow", budget: 0 },
        code: `/** Formats a price for display. */
export const formatPrice = (value: number) => String(value);

// what: Android 14 rejects a zero-length payload here
export const payload = [0];
`,
        errors: [{ message: "The one line left is `// why:`", line: 4, column: 1 }],
      },
      {
        name: "directives and a valid hatch are skipped while prose is counted",
        code: `// oxlint-disable-next-line typescript/no-explicit-any
export const parse = (input: any) => input;

// what: Android 14 rejects a zero-length payload here
export const payload = [0];

// the reducer runs twice in strict mode
export const strict = true;
`,
        errors: [{ message: "Make the code say this", line: 7, column: 1 }],
      },
      {
        name: "a comment that merely contains a directive is prose",
        code: `// remember to add eslint-disable here once the codemod lands
export const flag = true;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "jsdoc allow does not cover a block that merely contains an asterisk",
        options: { jsdoc: "allow" },
        code: `/* the width times the scale * 2 */
export const width = 4;
`,
        errors: [{ message: "Make the code say this", line: 1, column: 1 }],
      },
      {
        name: "a comment after a hashbang is still reviewed",
        code: `#!/usr/bin/env bun
// the entry point boots the server
export const main = () => 0;
`,
        errors: [{ message: "Make the code say this", line: 2, column: 1 }],
      },
      {
        name: "prose before a pair of hatches does not stop the hatches being collected",
        code: `// the client is a singleton
import { client } from "./client";

// what: Android 14 rejects a zero-length payload here
// what: the vendor SDK caps the retry window at 30 seconds
export const payload = client.send([0]);
`,
        errors: [
          { message: "Make the code say this", line: 1, column: 1 },
          { message: "Keep one `what:` line here", line: 5, column: 1 },
        ],
      },
      {
        name: "three prose comments report at three positions",
        code: `// the client is a singleton
import { client } from "./client";

export const send = () => {
  /* retry once */
  return client.send(); // fire and forget
};
`,
        errors: [
          { message: "Make the code say this", line: 1, column: 1 },
          { message: "Make the code say this", line: 5, column: 3 },
          { message: "Make the code say this", line: 6, column: 25 },
        ],
      },
    ],
  },

  "no-naming-convention": {
    valid: [
      {
        name: "the ordinary casings a component file uses",
        code: `const MAX_RETRIES = 3;

export const PriceRow = ({ amount }: { amount: number }) => {
  const formattedAmount = String(amount);
  return <span data-retries={MAX_RETRIES}>{formattedAmount}</span>;
};
`,
      },
      {
        name: "a single underscore is a placeholder",
        code: "const _ = require('side-effect');\nexport const ready = true;\n",
      },
      { name: "several underscores are still a placeholder", code: "const ___ = 1;\nexport const ready = true;\n" },
      { name: "a leading underscore is stripped before the format check", code: "export const _Internal = 1;\n" },
      { name: "a trailing underscore is stripped before the format check", code: "export const value_ = 1;\n" },
      { name: "a trailing dollar marks an observable", code: "export const count$ = 1;\n" },
      { name: "a leading dollar is stripped", code: "export const $element = 1;\n" },
      {
        name: "shorthand destructuring is left to the object it came from",
        code: `export const read = (props: Record<string, unknown>) => {
  const { user_name, is_active } = props;
  return [user_name, is_active];
};
`,
      },
      {
        name: "shorthand destructuring with a default is also left alone",
        code: `export const read = (props: Record<string, unknown>) => {
  const { user_name = "anon" } = props;
  return user_name;
};
`,
      },
      {
        name: "a destructured property key is not checked as an object property",
        code: `export const read = (props: Record<string, unknown>) => {
  const { Foo_Bar: label } = props;
  return label;
};
`,
      },
      {
        name: "function parameters are out of scope",
        code: `export function formatPrice(user_name: string, { is_active }: { is_active: boolean }) {
  return [user_name, is_active];
}
`,
      },
      {
        name: "a snake_case function declaration is out of scope",
        code: `export function format_price(value: number) {
  return String(value);
}
`,
      },
      {
        name: "class members are out of scope",
        code: `export class Store {
  cached_value = 1;

  read_all() {
    return this.cached_value;
  }
}
`,
      },
      {
        name: "object properties may be snake_case",
        code: "export const theme = { font_size: 14, line_height: 20 };\n",
      },
      { name: "object properties may be CONSTANT_CASE", code: "export const map = { MAX_RETRIES: 3 };\n" },
      { name: "object properties may be PascalCase", code: "export const registry = { PriceRow: 1 };\n" },
      {
        name: "numeric object keys are allowed",
        code: "export const breakpoints = { 0: 'sm', 768: 'md', 2.5: 'x' };\n",
      },
      {
        name: "library property names are spelled out exactly",
        code: `export const config = {
  enableFullScreenImage_legacy: true,
  experimental_backgroundImage: "none",
  unstable_conditionNames: [],
};
`,
      },
      {
        name: "the library variable name is spelled out exactly",
        code: "export const unstable_settings = { initialRouteName: 'index' };\n",
      },
      {
        name: "the library variable name needs no exemption as an object property",
        code: "export const routes = { unstable_settings: {} };\n",
      },
      {
        name: "a non-identifier string key is not checked",
        code: `export const attributes = { "data-testid": "row", "aria-label": "row" };
`,
      },
      {
        name: "computed object keys are skipped",
        code: "export const build = (Bad_Key: string) => ({ [Bad_Key]: 1 });\n",
      },
      {
        name: "computed type members are skipped",
        code: `export interface Registry {
  ["Bad_Key"]: string;
}
`,
      },
      {
        name: "computed method signatures are skipped",
        code: `export interface Registry {
  ["Do_Thing"](): void;
}
`,
      },
      {
        name: "a member reached through a symbol is not a name at all",
        code: `export interface Iterable2 {
  [Symbol.iterator](): Iterator<number>;
}
`,
      },
      {
        name: "type members may be snake_case or PascalCase",
        code: `export type Theme = {
  spacing_md: number;
  FontScale: number;
  MAX_WIDTH: number;
  lineHeight: number;
};
`,
      },
      {
        name: "enum members may be PascalCase or CONSTANT_CASE",
        code: `export enum Status {
  Idle,
  IN_PROGRESS,
}
`,
      },
      {
        name: "an enum member spelled as a non-identifier string is not checked",
        code: `export enum Header {
  "content-type" = 1,
}
`,
      },
      { name: "a bigint object key is not checked", code: "export const sizes = { 1n: 'one' };\n" },
      {
        name: "an array hole is skipped",
        code: "export const pick = (rows: string[]) => {\n  const [, second] = rows;\n  return second;\n};\n",
      },
      { name: "a capital with digits passes PascalCase", code: "export const A1 = 1;\n" },
      { name: "an all-capitals pair passes CONSTANT_CASE", code: "export const AB = 1;\n" },
      {
        name: "every casing admits digits anywhere in the name",
        code: `export const heading2Size = 14;

export const H2_MAX_WIDTH = 320;

export const MAX_H2_WIDTH = 320;

export const Heading2 = () => null;
`,
      },
      {
        name: "snake_case admits digits in either segment",
        code: "export const spacing = { level2_size: 8, level_2: 8 };\n",
      },
    ],
    invalid: [
      {
        name: "a snake_case variable",
        code: `export const font_size = 14;
`,
        errors: [
          { message: "Rename this variable `font_size` to camelCase, CONSTANT_CASE, PascalCase.", line: 1, column: 14 },
        ],
      },
      {
        name: "a variable mixing PascalCase with an underscore",
        code: `export const Price_Row = 1;
`,
        errors: [{ message: "Rename this variable `Price_Row`", line: 1, column: 14 }],
      },
      {
        name: "a variable whose affixes are not a leading underscore or a trailing dollar",
        code: `export const value$$ = 1;
`,
        errors: [
          {
            message: "Rename this variable `value$$` to a plain camelCase/CONSTANT_CASE/PascalCase identifier",
            line: 1,
            column: 14,
          },
        ],
      },
      {
        name: "a variable that is only a dollar sign",
        code: `export const $ = 1;
`,
        errors: [{ message: "to a plain camelCase/CONSTANT_CASE/PascalCase identifier", line: 1, column: 14 }],
      },
      {
        name: "the library property name is not a library variable name",
        code: `export const experimental_backgroundImage = "none";
`,
        errors: [{ message: "Rename this variable `experimental_backgroundImage`", line: 1, column: 14 }],
      },
      {
        name: "a renamed destructuring target",
        code: `export const read = (props: Record<string, unknown>) => {
  const { name: user_name } = props;
  return user_name;
};
`,
        errors: [{ message: "Rename this variable `user_name`", line: 2, column: 17 }],
      },
      {
        name: "a renamed destructuring target with a default",
        code: `export const read = (props: Record<string, unknown>) => {
  const { name: user_name = "anon" } = props;
  return user_name;
};
`,
        errors: [{ message: "Rename this variable `user_name`", line: 2, column: 17 }],
      },
      {
        name: "an object rest element",
        code: `export const read = (props: Record<string, unknown>) => {
  const { id, ...other_props } = props;
  return [id, other_props];
};
`,
        errors: [{ message: "Rename this variable `other_props`", line: 2, column: 18 }],
      },
      {
        name: "an array rest element",
        code: `export const read = (rows: string[]) => {
  const [first, ...remaining_rows] = rows;
  return [first, remaining_rows];
};
`,
        errors: [{ message: "Rename this variable `remaining_rows`", line: 2, column: 20 }],
      },
      {
        name: "an array hole before an offending element",
        code: `export const read = (rows: string[]) => {
  const [, second_row] = rows;
  return second_row;
};
`,
        errors: [{ message: "Rename this variable `second_row`", line: 2, column: 12 }],
      },
      {
        name: "every element of an array pattern is checked",
        code: `export const read = (rows: string[]) => {
  const [first_row, second_row] = rows;
  return [first_row, second_row];
};
`,
        errors: [
          { message: "Rename this variable `first_row`", line: 2, column: 10 },
          { message: "Rename this variable `second_row`", line: 2, column: 21 },
        ],
      },
      {
        name: "an array pattern element with a default",
        code: `export const read = (rows: string[]) => {
  const [first_row = "none"] = rows;
  return first_row;
};
`,
        errors: [{ message: "Rename this variable `first_row`", line: 2, column: 10 }],
      },
      {
        name: "a nested destructuring target",
        code: `export const read = (props: { user: { name: string } }) => {
  const {
    user: { name: user_name },
  } = props;
  return user_name;
};
`,
        errors: [{ message: "Rename this variable `user_name`", line: 3, column: 19 }],
      },
      {
        name: "an object pattern inside an array pattern",
        code: `export const read = (rows: { id: string }[]) => {
  const [{ id: row_id }] = rows;
  return row_id;
};
`,
        errors: [{ message: "Rename this variable `row_id`", line: 2, column: 16 }],
      },
      {
        name: "an object property mixing PascalCase with an underscore",
        code: `export const registry = { Price_Row: 1 };
`,
        errors: [
          {
            message: "Rename this object property `Price_Row` to camelCase, snake_case, CONSTANT_CASE, PascalCase.",
            line: 1,
            column: 27,
          },
        ],
      },
      {
        name: "an object property with an inner dollar sign",
        code: `export const registry = { price$row: 1 };
`,
        errors: [{ message: "Rename this object property `price$row` to a plain", line: 1, column: 27 }],
      },
      {
        name: "an object property that is only an underscore",
        code: `export const registry = { _: 1 };
`,
        errors: [{ message: "Rename this object property `_` to a plain", line: 1, column: 27 }],
      },
      {
        name: "a quoted key that is a valid identifier is checked",
        code: `export const registry = { "Price_Row": 1 };
`,
        errors: [{ message: "Rename this object property `Price_Row`", line: 1, column: 27 }],
      },
      {
        name: "an object method name",
        code: `export const handlers = {
  On_Settled() {
    return undefined;
  },
};
`,
        errors: [{ message: "Rename this object property `On_Settled`", line: 2, column: 3 }],
      },
      {
        name: "a near-miss of the library variable name",
        code: `export const unstable_setting = {};
`,
        errors: [{ message: "Rename this variable `unstable_setting`", line: 1, column: 14 }],
      },
      {
        name: "a near-miss of a library property name",
        code: `export const config = { experimental_backgroundColor: "none" };
`,
        errors: [{ message: "Rename this object property `experimental_backgroundColor`", line: 1, column: 25 }],
      },
      {
        name: "library property names are not allowed on type members",
        code: `export interface ImageProps {
  experimental_backgroundImage: string;
}
`,
        errors: [
          {
            message:
              "Rename this type member `experimental_backgroundImage` to camelCase, snake_case, CONSTANT_CASE, PascalCase.",
            line: 2,
            column: 3,
          },
        ],
      },
      {
        name: "a numeric type member is not a numeric object key",
        code: `export interface Breakpoints {
  768: string;
}
`,
        errors: [{ message: "Rename this type member `768` to a plain", line: 2, column: 3 }],
      },
      {
        name: "a type alias member",
        code: `export type Theme = {
  Font_Scale: number;
};
`,
        errors: [{ message: "Rename this type member `Font_Scale`", line: 2, column: 3 }],
      },
      {
        name: "a method signature",
        code: `export interface Api {
  Fetch_All(): Promise<void>;
}
`,
        errors: [{ message: "Rename this type member `Fetch_All`", line: 2, column: 3 }],
      },
      {
        name: "a camelCase enum member",
        code: `export enum Status {
  inProgress,
}
`,
        errors: [{ message: "Rename this enum member `inProgress` to CONSTANT_CASE, PascalCase.", line: 2, column: 3 }],
      },
      {
        name: "enum members may not be snake_case even though object properties may",
        code: `export enum Status {
  in_progress,
}
`,
        errors: [{ message: "Rename this enum member `in_progress`", line: 2, column: 3 }],
      },
      {
        name: "an enum member gets no affix stripping",
        code: `export enum Status {
  _Idle,
}
`,
        errors: [{ message: "Rename this enum member `_Idle` to CONSTANT_CASE, PascalCase.", line: 2, column: 3 }],
      },
      {
        name: "a non-ascii identifier key",
        code: `export const labels = { "café": 1 };
`,
        errors: [{ message: "Rename this object property `café` to a plain", line: 1, column: 25 }],
      },
      {
        name: "one file, one report per offending name",
        code: `export const font_size = 14;

export const theme = { Line_Height: 20 };

export interface Tokens {
  Font_Scale: number;
}
`,
        errors: [
          { message: "Rename this variable `font_size`", line: 1, column: 14 },
          { message: "Rename this object property `Line_Height`", line: 3, column: 24 },
          { message: "Rename this type member `Font_Scale`", line: 6, column: 3 },
        ],
      },
    ],
  },

  "components-tsx-only": {
    valid: [
      {
        name: "a bare export list beside an import is still a barrel",
        filename: "src/components/index.ts",
        code: 'import { Card } from "./card";\n\nexport { Card };\n',
      },
      {
        name: "a star export is a barrel",
        filename: "src/components/index.ts",
        code: 'export * from "./card";\n',
      },
      {
        name: "a re-export with a declaration attached is still a barrel entry",
        filename: "src/components/index.ts",
        code: 'export { Card } from "./card";\nexport * from "./row";\n',
      },
      {
        name: "a helper outside the components directory is none of this rule's business",
        filename: "src/utils/money.ts",
        code: "export const total = (a, b) => a + b;\n",
      },
      {
        name: "a directory merely named like the configured one does not count",
        filename: "src/componentsx/money.ts",
        code: "export const total = (a, b) => a + b;\n",
      },
      {
        name: "a component that renders an element",
        code: `export const PriceRow = ({ amount }: { amount: number }) => <span>{amount}</span>;
`,
      },
      {
        name: "a component that renders only a fragment",
        code: `export const Group = ({ children }: { children: unknown }) => {
  return <>{children}</>;
};
`,
      },
      {
        name: "jsx anywhere in the file is enough",
        code: `const icon = <svg />;

export const iconRegistry = { icon };
`,
      },
      {
        name: "jsx nested deep inside a callback",
        code: `export const rows = [1, 2].map(value => {
  const render = () => <li>{value}</li>;
  return render;
});
`,
      },
      { name: "an empty file", code: "" },
      { name: "a star barrel", code: 'export * from "./price-row";\n' },
      { name: "a namespaced star barrel", code: 'export * as icons from "./icons";\n' },
      { name: "a named re-export barrel", code: 'export { PriceRow } from "./price-row";\n' },
      { name: "a default re-export barrel", code: 'export { default } from "./price-row";\n' },
      { name: "a type-only re-export barrel", code: 'export type { PriceProps } from "./price-row";\n' },
      {
        name: "an import plus a bare named export list",
        code: `import { PriceRow } from "./price-row";

export { PriceRow };
`,
      },
      { name: "a file that only imports", code: 'import "./polyfills";\n' },
    ],
    invalid: [
      {
        name: "a declaration beside re-exports is not a barrel",
        filename: "src/components/index.ts",
        code: 'export * from "./card";\nexport const GAP = 8;\n',
        errors: 1,
      },
      {
        name: "an empty dir option is rejected before linting",
        filename: "src/components/helper.ts",
        code: "export const total = (a, b) => a + b;\n",
        options: { dir: "components" },
        errors: 1,
      },
      {
        name: "the directory is configurable",
        filename: "app/ui/helper.ts",
        code: "export const total = (a, b) => a + b;\n",
        options: { dir: "app/ui" },
        errors: 1,
      },
      {
        name: "a helper module with no jsx",
        filename: "src/components/case.tsx",
        code: `export const add = (a: number, b: number) => a + b;
`,
        errors: [{ message: "`components/` holds only files that render JSX", line: 1, column: 1 }],
      },
      {
        name: "a hook with no jsx",
        filename: "src/components/case.tsx",
        code: `import { useState } from "react";

export default function useToggle(initial: boolean) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(!on)] as const;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a type-only module is not a barrel",
        filename: "src/components/case.tsx",
        code: `export interface PriceProps {
  amount: number;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a barrel with one declaration at the end",
        filename: "src/components/case.tsx",
        code: `export * from "./price-row";
export { default as Icons } from "./icons";
export const VERSION = "1.0.0";
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a barrel with one statement at the start",
        filename: "src/components/case.tsx",
        code: `console.log("loaded");
export * from "./price-row";
export { default as Icons } from "./icons";
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
      {
        name: "a file full of offending statements still reports once",
        filename: "src/components/case.tsx",
        code: `const a = 1;
const b = 2;

export const sum = a + b;

export function twice(value: number) {
  return value * 2;
}
`,
        errors: [{ message: "Move this file to `src/utils`", line: 1, column: 1 }],
      },
    ],
  },

  "no-packed-condition": {
    valid: [
      {
        name: "a condition split into named booleans",
        code: `export const label = (value?: number, displayed?: number, revealed?: boolean) => {
  const hasValue = value !== undefined;
  const changed = displayed !== value;
  const readable = revealed === true || displayed === undefined;
  if (hasValue && changed && readable) return "show";
  return "hide";
};
`,
      },
      {
        name: "three comparisons joined by and sit on the limit",
        code: `export const pick = (a: number, b: number, c: number) => {
  if (a === 1 && b === 2 && c === 3) return a;
  return 0;
};
`,
      },
      {
        name: "a call reads as one term however long its arguments",
        code: `export const ready = (a: boolean, b: boolean) =>
  a && b && matches(one === two, three === four, five === six);
`,
      },
      {
        name: "no boolean operator, no gate",
        code: `export const same = (a: number, b: number) => {
  if (a === b) return true;
  return false;
};
`,
      },
      {
        name: "a packed condition under a raised max",
        options: 8,
        code: `export const label = (value?: number, displayed?: number, revealed?: boolean) => {
  if (value !== undefined && displayed !== value && (revealed === true || displayed === undefined)) return "show";
  return "hide";
};
`,
      },
      {
        name: "terms spread across separate statements",
        code: `export const label = (a?: number, b?: number) => {
  if (a === undefined || b === undefined) return "none";
  if (a > b && a - b > 2) return "far";
  return "near";
};
`,
      },
    ],
    invalid: [
      {
        name: "the agent-written condition this rule exists for",
        code: `export const label = (value?: number, displayed?: number, revealed?: boolean) => {
  if (value !== undefined && displayed !== value && (revealed === true || displayed === undefined)) return "show";
  return "hide";
};
`,
        errors: [{ message: "packs 7 operators, past the 5", line: 2, column: 7 }],
      },
      {
        name: "a ternary test",
        code: `export const label = (a: number, b: number, c: boolean) =>
  a === b && b > 0 && (c || a !== 0) ? "yes" : "no";
`,
        errors: [{ message: "packs 6 operators", line: 2 }],
      },
      {
        name: "a while test",
        code: `export const drain = (a: number, b: number, c: boolean) => {
  while (a === b && b > 0 && (c || a !== 0)) return a;
  return b;
};
`,
        errors: 1,
      },
      {
        name: "a for test",
        code: `export const scan = (limit: number, stop: boolean, other: number) => {
  for (let i = 0; i < limit && !stop && (other > 1 || other === -1); i += 1) return i;
  return -1;
};
`,
        errors: 1,
      },
      {
        name: "a lowered max catches two terms",
        options: 1,
        code: `export const pick = (a: boolean, count: number) => {
  if (a && count > 0) return count;
  return 0;
};
`,
        errors: [{ message: "past the 1 a reader takes in" }],
      },
      {
        name: "negated groups count what they wrap",
        code: `export const label = (a: number, b: number, c: number, d: number) => {
  if (!(a === b && c === d) && !(a === d) && !(b === c)) return "hit";
  return "miss";
};
`,
        errors: 1,
      },
      {
        name: "a nested ternary inside the test counts too",
        code: `export const label = (a: number, b: number, c: boolean, d: boolean) => {
  if ((c ? a : b) === 0 && (d ? a : b) === 1 && a !== b) return "hit";
  return "miss";
};
`,
        errors: 1,
      },
    ],
  },
  "hoist-intl": {
    valid: [
      {
        name: "a formatter hoisted to module scope",
        code: `const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const PriceRow = ({ amount }: { amount: number }) => <span>{currencyFormatter.format(amount)}</span>;
`,
      },
      {
        name: "a formatter inside a useMemo that renders jsx",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside a React.useMemo that renders jsx",
        code: `import * as React from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return React.useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside a useCallback that renders jsx",
        code: `import { useCallback } from "react";

export const PriceList = ({ locale }: { locale: string }) => {
  const renderRow = useCallback(
    (row: number) => <li>{new Intl.NumberFormat(locale).format(row)}</li>,
    [locale]
  );
  return <ul>{[1, 2].map(renderRow)}</ul>;
};
`,
      },
      {
        name: "a formatter nested two calls deep inside a useMemo that renders jsx",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return useMemo(
    () => <span>{[new Intl.NumberFormat(locale)].map(one => one.format(amount)).join("")}</span>,
    [amount, locale]
  );
};
`,
      },
      {
        name: "a module-level helper in a file that renders jsx",
        code: `const formatPrice = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatPrice(amount)}</span>;
`,
      },
      {
        name: "a formatter in a function that renders nothing",
        code: `export const formatPrice = (value: number) => {
  const formatter = new Intl.NumberFormat("en-US");
  return formatter.format(value);
};

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatPrice(amount)}</span>;
`,
      },
      {
        name: "a namespaced Intl is a different object",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new globalThis.Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "a lookalike namespace is not Intl",
        code: `import { IntlPolyfill } from "./intl-polyfill";

export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new IntlPolyfill.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "calling Intl.NumberFormat without new is not a construction",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
      },
      {
        name: "useMemo reached through an object still counts as the memo hook",
        code: `import * as hooks from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  return hooks.useMemo(() => <span>{new Intl.NumberFormat(locale).format(amount)}</span>, [amount, locale]);
};
`,
      },
      {
        name: "a formatter inside an object at module scope",
        code: `export const formatters = { price: new Intl.NumberFormat("en-US") };

export const PriceRow = ({ amount }: { amount: number }) => <span>{formatters.price.format(amount)}</span>;
`,
      },
    ],
    invalid: [
      {
        name: "a formatter in an inner helper of a component",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const format = (value: number) => new Intl.NumberFormat("en-US").format(value);
  return <span>{format(amount)}</span>;
};
`,
        errors: 1,
      },
      {
        name: "a formatter inside a useEffect of a component",
        code: `import { useEffect } from "react";

export const PriceRow = ({ amount }: { amount: number }) => {
  useEffect(() => {
    const formatter = new Intl.NumberFormat("en-US");
    console.log(formatter.format(amount));
  }, [amount]);
  return <span>{amount}</span>;
};
`,
        errors: [{ line: 5, column: 23 }],
      },
      {
        name: "a formatter built in the body of a component",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const formatter = new Intl.NumberFormat("en-US");
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 2, column: 21 }],
      },
      {
        name: "a component whose only jsx is a fragment",
        code: `export function PriceRow({ amount }: { amount: number }) {
  const formatter = new Intl.DateTimeFormat("en-US");
  return <>{formatter.format(amount)}</>;
}
`,
        errors: [{ message: "wrap it in `useMemo` keyed on the locale", line: 2, column: 21 }],
      },
      {
        name: "a class render method",
        code: `import { Component } from "react";

export class PriceRow extends Component<{ amount: number }> {
  render() {
    const formatter = new Intl.NumberFormat("en-US");
    return <span>{formatter.format(this.props.amount)}</span>;
  }
}
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 5, column: 23 }],
      },
      {
        name: "a bare constructor before the Intl one is not a member expression",
        code: `export const Clock = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US");
  return <time>{formatter.format(now)}</time>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 3, column: 21 }],
      },
      {
        name: "a wrapping call that is not a memo hook",
        code: `import { cache } from "./cache";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const formatter = cache(new Intl.NumberFormat(locale));
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 27 }],
      },
      {
        name: "a lookalike memo hook does not exempt the call",
        code: `import { useShallowMemo } from "./hooks";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const formatter = useShallowMemo(new Intl.NumberFormat(locale), [locale]);
  return <span>{formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 36 }],
      },
      {
        name: "an inner render callback that renders jsx of its own",
        code: `export const PriceList = ({ rows }: { rows: number[] }) => (
  <ul>
    {rows.map(row => {
      const formatter = new Intl.NumberFormat("en-US");
      return <li key={row}>{formatter.format(row)}</li>;
    })}
  </ul>
);
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 4, column: 25 }],
      },
      {
        name: "two formatters in one component report twice",
        code: `export const PriceRow = ({ amount }: { amount: number }) => {
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const percent = new Intl.NumberFormat("en-US", { style: "percent" });
  return (
    <span>
      {currency.format(amount)} {percent.format(amount)}
    </span>
  );
};
`,
        errors: [
          { message: "Move this `Intl` formatter to module scope", line: 2, column: 20 },
          { message: "Move this `Intl` formatter to module scope", line: 3, column: 19 },
        ],
      },
      {
        name: "a memo hook elsewhere in the component does not cover a bare construction",
        code: `import { useMemo } from "react";

export const PriceRow = ({ amount, locale }: { amount: number; locale: string }) => {
  const label = useMemo(() => locale.toUpperCase(), [locale]);
  const formatter = new Intl.NumberFormat(locale);
  return <span>{label}: {formatter.format(amount)}</span>;
};
`,
        errors: [{ message: "Move this `Intl` formatter to module scope", line: 5, column: 21 }],
      },
    ],
  },

  "use-design-system": {
    valid: [
      {
        name: "no options and no design-system directory to scan",
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "an empty options object still finds nothing to ban",
        options: {},
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "an empty use map bans nothing",
        options: { use: {} },
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "a directory holding no tsx file bans nothing",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/views.ts",
        code: `import { View } from "react-native";

export const Panel = View;
`,
      },
      {
        name: "a barrel never becomes a wrapped component named Index",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/index.tsx",
        code: `import { Index } from "react-native";

export const Entry = Index;
`,
      },
      {
        name: "only ios android native and web are stripped as platform suffixes",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/pressable.mobile.tsx",
        code: `import { Pressable } from "react-native";

export const Button = Pressable;
`,
      },
      {
        name: "files inside the design-system directory are exempt by default",
        options: { dir: "designsys" },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { TouchableOpacity } from "react-native";

export const Pressable = TouchableOpacity;
`,
      },
      {
        name: "an explicit exempt fragment matching the filename",
        options: { dir: "designsys", exempt: ["pressable"] },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { TouchableOpacity } from "react-native";

export const Pressable = TouchableOpacity;
`,
      },
      {
        name: "a banned name imported from another module",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { TouchableOpacity } from "react-native-web";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "default and namespace imports are not named specifiers",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import ReactNative, * as RN from "react-native";

export const Button = ReactNative ?? RN;
`,
      },
      {
        name: "an unwrapped primitive from the same module",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { View, Text } from "react-native";

export const Button = View ?? Text;
`,
      },
      {
        name: "importing the wrapper itself",
        options: { use: { Card: "View" } },
        code: `import { Card } from "@/components/ui/card";

export const Panel = Card;
`,
      },
      {
        name: "a use entry whose replaced name is never imported",
        options: { use: { Card: "View" } },
        code: `import { Text } from "react-native";

export const Label = Text;
`,
      },
      {
        name: "legacy equivalents are attached to Pressable only",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/button.tsx",
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
      },
      {
        name: "an absolute directory scans only the wrappers it holds",
        options: { dir: ABSOLUTE_DESIGN_SYSTEM },
        code: `import { View, ScrollView } from "react-native";

export const Panel = View ?? ScrollView;
`,
      },
      {
        name: "a use entry whose source module nothing imports from",
        options: { use: { Icon: { replaces: "Feather", from: "@expo/vector-icons" } } },
        code: `import { Feather } from "react-native";

export const Glyph = Feather;
`,
      },
    ],
    invalid: [
      {
        name: "a scanned wrapper bans the primitive it wraps",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { Pressable } from "react-native";

export const Button = Pressable;
`,
        errors: [
          {
            message: 'Import `Pressable` from "@/components/ui/pressable" instead of `Pressable` from react-native.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "every legacy touchable maps to the Pressable wrapper",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import {
  View,
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";

export const all = [
  View,
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
];
`,
        errors: [
          { message: "instead of `Pressable` from react-native", line: 3, column: 3 },
          { message: "instead of `TouchableHighlight` from react-native", line: 4, column: 3 },
          { message: "instead of `TouchableNativeFeedback` from react-native", line: 5, column: 3 },
          { message: "instead of `TouchableOpacity` from react-native", line: 6, column: 3 },
          { message: "instead of `TouchableWithoutFeedback` from react-native", line: 7, column: 3 },
        ],
      },
      {
        name: "a default specifier ahead of a banned named specifier",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import ReactNative, { Pressable } from "react-native";

export const all = [ReactNative, Pressable];
`,
        errors: [{ message: "instead of `Pressable` from react-native", line: 1, column: 23 }],
      },
      {
        name: "a string-literal import name ahead of a banned named specifier",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { "Pressable" as Aliased, TouchableOpacity } from "react-native";

export const all = [Aliased, TouchableOpacity];
`,
        errors: [{ message: "instead of `TouchableOpacity` from react-native", line: 1, column: 34 }],
      },
      {
        name: "a directory of several files bans every tsx wrapper in it",
        options: { dir: join(ABSOLUTE_DESIGN_SYSTEM, "..") },
        code: `import { Good, Bad } from "react-native";

export const all = [Good, Bad];
`,
        errors: [
          { message: 'Import `Good` from "@/components/ui/good" instead of `Good`', line: 1, column: 10 },
          { message: 'Import `Bad` from "@/components/ui/bad" instead of `Bad`', line: 1, column: 16 },
        ],
      },
      {
        name: "a platform-suffixed wrapper resolves to the base name",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/pressable.ios.tsx",
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "@/components/ui/pressable"', line: 1, column: 10 }],
      },
      {
        name: "a kebab-cased filename becomes a PascalCase component",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/date-picker.tsx",
        code: `import { DatePicker } from "react-native";

export const Picker = DatePicker;
`,
        errors: [{ message: 'Import `DatePicker` from "@/components/ui/date-picker"', line: 1, column: 10 }],
      },
      {
        name: "empty segments in a filename are dropped",
        options: { dir: "designsys", exempt: NOT_EXEMPT },
        filename: "../../designsys/-date--picker-.tsx",
        code: `import { DatePicker } from "react-native";

export const Picker = DatePicker;
`,
        errors: [{ message: 'Import `DatePicker` from "@/components/ui/-date--picker-"', line: 1, column: 10 }],
      },
      {
        name: "an alias changes where the wrapper is imported from",
        options: { dir: "designsys", alias: "~/ui", exempt: NOT_EXEMPT },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "~/ui/pressable"', line: 1, column: 10 }],
      },
      {
        name: "an empty exempt list exempts nothing",
        options: { dir: "designsys", exempt: [] },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { TouchableOpacity } from "react-native";

export const Button = TouchableOpacity;
`,
        errors: [{ message: 'Import `Pressable` from "@/components/ui/pressable"', line: 1, column: 10 }],
      },
      {
        name: "an absolute design-system directory is scanned where it stands",
        options: { dir: ABSOLUTE_DESIGN_SYSTEM },
        code: `import { Text } from "react-native";

export const Label = Text;
`,
        errors: [
          {
            message: 'Import `Text` from "@/components/ui/text" instead of `Text` from react-native',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry given as a single name",
        options: { use: { Card: "View" } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [
          {
            message: 'Import `Card` from "@/components/ui/card" instead of `View` from react-native.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry given as a list of names",
        options: { use: { Stack: ["View", "ScrollView"] } },
        code: `import { View, ScrollView, Text } from "react-native";

export const all = [View, ScrollView, Text];
`,
        errors: [
          { message: 'Import `Stack` from "@/components/ui/stack" instead of `View`', line: 1, column: 10 },
          { message: 'Import `Stack` from "@/components/ui/stack" instead of `ScrollView`', line: 1, column: 16 },
        ],
      },
      {
        name: "a use entry that names its own source module",
        options: { use: { Icon: { replaces: "Feather", from: "@expo/vector-icons" } } },
        code: `import { Feather } from "@expo/vector-icons";
import { Feather as RNFeather } from "react-native";

export const all = [Feather, RNFeather];
`,
        errors: [
          {
            message: 'Import `Icon` from "@/components/ui/icon" instead of `Feather` from @expo/vector-icons',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry with an explicit path and a reason",
        options: { use: { Button: { replaces: "Button", path: "~/ui/button", reason: "It carries the haptics." } } },
        code: `import { Button } from "react-native";

export const Cta = Button;
`,
        errors: [
          {
            message:
              'Import `Button` from "~/ui/button" instead of `Button` from react-native. It carries the haptics.',
            line: 1,
            column: 10,
          },
        ],
      },
      {
        name: "a use entry without a reason ends at the wrapper sentence",
        options: { use: { Card: { replaces: "View" } } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [{ message: /react-native\.$/, line: 1, column: 10 }],
      },
      {
        name: "a kebab-cased path is derived from the component name",
        options: { use: { DatePicker2Row: "View" } },
        code: `import { View } from "react-native";

export const Picker = View;
`,
        errors: [{ message: 'Import `DatePicker2Row` from "@/components/ui/date-picker2-row"', line: 1, column: 10 }],
      },
      {
        name: "the alias also feeds the derived path of a use entry",
        options: { alias: "~/ui", use: { Card: "View" } },
        code: `import { View } from "react-native";

export const Panel = View;
`,
        errors: [{ message: 'Import `Card` from "~/ui/card"', line: 1, column: 10 }],
      },
      {
        name: "a renamed import still reports under its original name",
        options: { use: { Card: "View" } },
        code: `import { View as Box } from "react-native";

export const Panel = Box;
`,
        errors: [{ message: "instead of `View` from react-native", line: 1, column: 10 }],
      },
      {
        name: "a use entry overrides a scanned wrapper for the same primitive",
        options: {
          dir: "designsys",
          exempt: NOT_EXEMPT,
          use: { Touchable: { replaces: "TouchableOpacity", path: "~/ui/touchable" } },
        },
        filename: DESIGN_SYSTEM_FILE,
        code: `import { Pressable, TouchableOpacity } from "react-native";

export const all = [Pressable, TouchableOpacity];
`,
        errors: [
          {
            message: 'Import `Pressable` from "@/components/ui/pressable" instead of `Pressable`',
            line: 1,
            column: 10,
          },
          { message: 'Import `Touchable` from "~/ui/touchable" instead of `TouchableOpacity`', line: 1, column: 21 },
        ],
      },
    ],
  },
});
