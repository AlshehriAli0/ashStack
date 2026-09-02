import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ModuleManifest, Rule } from "../packages/lint/dist/lib/types.js";
import { coreModules, reactModules, reactNativeModules } from "../packages/lint/dist/modules.js";
import { fileFor, ruleMember, rulesOf, settingType, type Tier, tsType } from "../scripts/generate-rule-types.js";

type Schema = Parameters<typeof tsType>[0];

const rule = (description: string, meta: Partial<Rule["meta"]> = {}): Rule => ({
  meta: { type: "problem", docs: { description }, ...meta },
  create: () => ({}),
});

const withSchema = (schema: Schema[]): Rule => rule("Does a thing.", { schema });

const moduleWith = (name: string, rules: Record<string, Rule>): ModuleManifest => ({
  meta: { name: `@ashstack/${name}` },
  rules,
  url: import.meta.url,
  docsWhen: "always on",
});

const tierOf = (modules: ModuleManifest[]): Tier => ({
  file: "probe.ts",
  typeName: "ProbeRuleId",
  entry: "probe()",
  modules,
});

const RULE_TYPES = join(import.meta.dir, "..", "packages", "lint", "src", "lib", "rule-types");
const generated = (file: string): string => readFileSync(join(RULE_TYPES, `${file}.ts`), "utf8");

describe("tsType", () => {
  it("spells out each scalar a schema can name", () => {
    expect(tsType({ type: "boolean" })).toBe("boolean");
    expect(tsType({ type: "string" })).toBe("string");
    expect(tsType({ type: "integer" })).toBe("number");
    expect(tsType({ type: "number" })).toBe("number");
  });

  it("turns an enum into a union of literals", () => {
    expect(tsType({ enum: ["allow", "report"] })).toBe('"allow" | "report"');
  });

  it("turns anyOf into a union", () => {
    expect(tsType({ anyOf: [{ type: "string" }, { type: "boolean" }] })).toBe("string | boolean");
  });

  it("wraps an array's item type, so a union of items still parses", () => {
    expect(tsType({ type: "array", items: { type: "string" } })).toBe("Array<string>");
    expect(tsType({ type: "array", items: { anyOf: [{ type: "string" }, { type: "number" }] } })).toBe(
      "Array<string | number>"
    );
  });

  it("marks a property optional unless the schema requires it", () => {
    const schema: Schema = {
      type: "object",
      properties: { replaces: { type: "string" }, reason: { type: "string" } },
      required: ["replaces"],
    };
    expect(tsType(schema)).toBe("{ replaces: string; reason?: string }");
  });

  it("quotes a property name that is not an identifier", () => {
    expect(tsType({ type: "object", properties: { "kebab-key": { type: "boolean" } } })).toBe(
      '{ "kebab-key"?: boolean }'
    );
  });

  it("reads an open object as a Record of its value type", () => {
    expect(tsType({ type: "object", additionalProperties: { type: "string" } })).toBe("Record<string, string>");
    expect(tsType({ type: "object", additionalProperties: false })).toBe("Record<string, unknown>");
  });

  it("nests", () => {
    const schema: Schema = {
      type: "object",
      properties: { use: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } } },
    };
    expect(tsType(schema)).toBe("{ use?: Record<string, Array<string>> }");
  });

  it("falls back to unknown rather than guessing", () => {
    expect(tsType({ type: "null" })).toBe("unknown");
    expect(tsType({ type: "array" })).toBe("unknown");
    expect(tsType({ type: "array", items: [{ type: "string" }] })).toBe("unknown");
  });
});

describe("settingType", () => {
  it("accepts a bare severity when the rule takes no options", () => {
    expect(settingType(rule("Does a thing."))).toBe("RuleSetting");
  });

  it("adds the option tuple when the rule declares one", () => {
    expect(settingType(withSchema([{ type: "integer" }]))).toBe("RuleSetting<[number]>");
  });

  it("carries every option a rule declares, each optional to set", () => {
    expect(settingType(withSchema([{ type: "string" }, { type: "boolean" }]))).toBe("RuleSetting<[string, boolean]>");
  });

  // what: an editor intersects the value with every arm, so a union printed eight arms per hover
  it("names the shape instead of spelling a union, which an editor renders unreadably", () => {
    expect(settingType(withSchema([{ type: "integer" }]))).not.toContain("|");
  });
});

describe("ruleMember", () => {
  const doc = (one: Rule): string => ruleMember(["@ashstack/core/probe", one]).join("\n");

  it("documents the rule and links its RULES.md section", () => {
    const text = doc(rule("Requires a thing."));
    expect(text).toContain("* Requires a thing.");
    expect(text).toContain(
      "@see https://github.com/AlshehriAli0/ashStack/blob/main/packages/lint/RULES.md#ashstackcoreprobe"
    );
    expect(text).toContain('"@ashstack/core/probe"?: RuleSetting;');
  });

  it("says when a rule is off by default or gated on a dependency", () => {
    const text = doc(rule("Requires a thing.", { defaultOff: true, packages: ["zod"] }));
    expect(text).toContain("Off by default");
    expect(text).toContain("Enabled only when one of `zod` is a dependency.");
  });

  it("escapes a description that would close the block early", () => {
    const text = doc(rule("A /** */ block stays."));
    const terminators = text.split("*/").length - 1;
    expect(terminators).toBe(1);
    expect(text).toContain("block stays.");
  });
});

describe("fileFor", () => {
  const modules = [moduleWith("one", { alpha: rule("A.") }), moduleWith("two", { beta: rule("B.") })];
  const text = fileFor(tierOf(modules));

  it("augments oxlint's own rule map rather than declaring a new one", () => {
    expect(text).toContain('declare module "oxlint" {');
    expect(text).toContain("interface DummyRuleMap {");
    expect(text).toContain('import type { AllowWarnDeny } from "oxlint";');
    expect(text).toContain("type RuleSetting<Options extends unknown[] = []>");
  });

  it("names every rule in both the union and the map", () => {
    expect(text).toContain('export type ProbeRuleId = "@ashstack/one/alpha" | "@ashstack/two/beta";');
    for (const id of ["@ashstack/one/alpha", "@ashstack/two/beta"]) {
      expect(text).toContain(`${JSON.stringify(id)}?:`);
    }
  });

  it("marks itself generated, so nobody edits it by hand", () => {
    expect(text.startsWith("// GENERATED by scripts/generate-rule-types.ts")).toBe(true);
  });
});

describe("the generated files", () => {
  const ALL = [...coreModules, ...reactModules, ...reactNativeModules];
  const TIERS = ["core", "react", "react-native"];

  it("type every rule this package ships", () => {
    const all = TIERS.map(generated).join("\n");
    const missing = rulesOf(ALL)
      .map(([id]) => id)
      .filter(id => !all.includes(`${JSON.stringify(id)}?:`));
    expect(missing).toEqual([]);
  });

  it("type the vendored effect rules too, which have no module of their own", () => {
    expect(generated("react")).toContain('"@ashstack/effects/no-derived-state"?:');
  });

  it("declare each rule in exactly one tier, or the augmentations collide", () => {
    const member = /^\s+"(@ashstack\/[^"]+)"\?:/gm;
    const declared = TIERS.flatMap(file => Array.from(generated(file).matchAll(member), match => match[1] ?? ""));
    expect(declared).toHaveLength(new Set(declared).size);
  });

  it("keep every entry reachable from its own tier, so a consumer's hover is loaded", () => {
    const entries: [string, string[]][] = [
      ["core", ["core"]],
      ["react", ["core", "react"]],
      ["react-native", ["core", "react", "react-native"]],
    ];
    for (const [entry, tiers] of entries) {
      const source = readFileSync(
        fileURLToPath(new URL(`../packages/lint/src/${entry}/index.ts`, import.meta.url)),
        "utf8"
      );
      for (const tier of tiers) expect(source).toContain(`from "../lib/rule-types/${tier}.js"`);
    }
  });
});
