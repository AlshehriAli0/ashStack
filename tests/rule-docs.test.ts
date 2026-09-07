import { describe, expect, it } from "bun:test";

import type { OxlintConfig, Rule } from "../packages/lint/dist/lib/types.js";
import { cell, type EntryConfig, optionsDoc, setBy } from "../scripts/rule-options-doc.js";

const ruleWith = (schema: Rule["meta"]["schema"]): Rule => ({
  meta: { type: "problem", docs: { description: "A rule." }, schema },
  create: () => ({}),
});

const config = (rules: NonNullable<OxlintConfig["rules"]>): OxlintConfig => ({ rules });

const NUMBER_OPTION = ruleWith([
  { type: "integer", minimum: 1, default: 15, description: "Highest complexity one function may reach." },
]);

const OBJECT_OPTION = ruleWith([
  {
    type: "object",
    properties: {
      jsdoc: { enum: ["allow", "report"], default: "report", description: "Keeps a `/** */` block." },
      budget: { type: "integer", default: 2, description: "Lines one file may keep." },
    },
    additionalProperties: false,
  },
]);

describe("optionsDoc", () => {
  it("says nothing for a rule that takes no options", () => {
    expect(optionsDoc(ruleWith(undefined), "@ashstack/core/rule", [])).toEqual([]);
  });

  it("says nothing for a rule whose schema is an empty list", () => {
    expect(optionsDoc(ruleWith([]), "@ashstack/core/rule", [])).toEqual([]);
  });

  it("spells a positional option as a sentence rather than a one-row table", () => {
    expect(optionsDoc(NUMBER_OPTION, "@ashstack/core/rule", []).join("\n")).toBe(
      `**Options**\n\nTakes a \`number\`, default \`15\`. Highest complexity one function may reach.\n`
    );
  });

  it("heads a named-option table with the shape as one TypeScript line", () => {
    const lines = optionsDoc(OBJECT_OPTION, "@ashstack/core/rule", []);
    expect(lines.slice(0, 4)).toEqual([
      "**Options**",
      "",
      "```ts",
      '[{ jsdoc?: "allow" | "report"; budget?: number }]',
    ]);
  });

  it("gives a row per option carrying its type, default and description", () => {
    const lines = optionsDoc(OBJECT_OPTION, "@ashstack/core/rule", []);
    expect(lines).toContain("| `budget` | `number` | `2` | Lines one file may keep. |");
  });

  it("escapes a pipe inside a cell, which would otherwise end the column early", () => {
    const lines = optionsDoc(OBJECT_OPTION, "@ashstack/core/rule", []);
    expect(lines).toContain('| `jsdoc` | `"allow" \\| "report"` | `"report"` | Keeps a `/** */` block. |');
  });

  it("shows a nested option's example as the config a consumer writes", () => {
    const rule = ruleWith([
      {
        type: "object",
        properties: {
          use: {
            type: "object",
            default: {},
            description: "Wrappers.",
            examples: [{ Button: "Pressable" }],
          },
        },
      },
    ]);
    expect(optionsDoc(rule, "@ashstack/core/rule", []).join("\n")).toContain(
      'Each `use` value takes one of these shapes:\n\n```jsonc\n{\n  "use": {\n    "Button": "Pressable"\n  }\n}\n```'
    );
  });

  it("leaves out the example block when a property declares none", () => {
    expect(optionsDoc(OBJECT_OPTION, "@ashstack/core/rule", []).join("\n")).not.toContain("```jsonc");
  });
});

describe("cell", () => {
  it("escapes every pipe, not only the first", () => {
    expect(cell("a | b | c")).toBe("a \\| b \\| c");
  });

  it("leaves text without a pipe alone", () => {
    expect(cell("plain text")).toBe("plain text");
  });
});

describe("setBy", () => {
  const id = "@ashstack/core/max-lines";

  it("says nothing when no entry passes an option", () => {
    expect(setBy(id, [["core()", config({ [id]: "error" })]])).toEqual([]);
  });

  it("says nothing when the rule is absent from every entry", () => {
    expect(setBy(id, [["core()", config({})]])).toEqual([]);
  });

  it("names the entry that passes an option", () => {
    const entries: EntryConfig[] = [
      ["core()", config({ [id]: "error" })],
      ["react()", config({ [id]: ["error", 250] })],
    ];
    expect(setBy(id, entries)).toEqual(['Set by: `react()` → `["error",250]`', ""]);
  });

  it("skips an entry that inherits the one above it unchanged", () => {
    const entries: EntryConfig[] = [
      ["core()", config({ [id]: ["error", 300] })],
      ["react()", config({ [id]: ["error", 250] })],
      ["react-native()", config({ [id]: ["error", 250] })],
    ];
    expect(setBy(id, entries)).toEqual(['Set by: `core()` → `["error",300]`, `react()` → `["error",250]`', ""]);
  });

  it("names an entry that tightens a setting a second time", () => {
    const entries: EntryConfig[] = [
      ["core()", config({ [id]: ["error", 300] })],
      ["react()", config({ [id]: ["error", 250] })],
      ["react-native()", config({ [id]: ["error", 200] })],
    ];
    expect(setBy(id, entries)).toHaveLength(2);
    expect(setBy(id, entries)[0]).toContain('`react-native()` → `["error",200]`');
  });
});
