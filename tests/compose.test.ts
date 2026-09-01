import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

import { mergeConfigs } from "../packages/lint/dist/lib/merge.js";
import { composeModules, defineModule, shortName } from "../packages/lint/dist/lib/module.js";
import type { BanGroup, ModuleManifest, OxlintConfig, Rule } from "../packages/lint/dist/lib/types.js";

const here = import.meta.url;
const herePath = fileURLToPath(here);

const rule = (description: string, meta: Partial<Rule["meta"]> = {}): Rule => ({
  meta: { type: "problem", docs: { description }, ...meta },
  create: () => ({}),
});

const moduleWith = (parts: Partial<ModuleManifest> & { name: string }): ModuleManifest =>
  defineModule({
    meta: { name: `@ashstack/${parts.name}` },
    rules: parts.rules ?? { "a-rule": rule("Does a thing.") },
    url: parts.url ?? here,
    packages: parts.packages,
    option: parts.option,
    docsWhen: parts.docsWhen ?? "always on",
    restrictedImports: parts.restrictedImports,
  });

describe("mergeConfigs", () => {
  it("lets the delta win on a scalar key", () => {
    const merged = mergeConfigs({ ignorePatterns: ["a"] }, { ignorePatterns: ["b"] });
    expect(merged.ignorePatterns).toEqual(["b"]);
  });

  it("keeps a base key the delta does not mention", () => {
    expect(mergeConfigs({ ignorePatterns: ["a"] }, {}).ignorePatterns).toEqual(["a"]);
  });

  it("unions plugins without duplicates and in base-first order", () => {
    const merged = mergeConfigs({ plugins: ["eslint", "import"] }, { plugins: ["import", "react"] });
    expect(merged.plugins).toEqual(["eslint", "import", "react"]);
  });

  it("unions jsPlugins without duplicates", () => {
    const merged = mergeConfigs({ jsPlugins: ["/a.js", "/b.js"] }, { jsPlugins: ["/b.js", "/c.js"] });
    expect(merged.jsPlugins).toEqual(["/a.js", "/b.js", "/c.js"]);
  });

  it("gives empty arrays for plugin lists neither side sets", () => {
    const merged = mergeConfigs({}, {});
    expect(merged.plugins).toEqual([]);
    expect(merged.jsPlugins).toEqual([]);
    expect(merged.overrides).toEqual([]);
  });

  it("merges env per key with the delta winning", () => {
    const merged = mergeConfigs({ env: { builtin: true, es2024: true } }, { env: { es2024: false } });
    expect(merged.env).toEqual({ builtin: true, es2024: false });
  });

  it("merges globals per key", () => {
    const merged = mergeConfigs({ globals: { __DEV__: "readonly" } }, { globals: { jest: "writable" } });
    expect(merged.globals).toEqual({ __DEV__: "readonly", jest: "writable" });
  });

  it("merges categories per key with the delta winning", () => {
    const merged = mergeConfigs(
      { categories: { correctness: "error", style: "off" } },
      { categories: { style: "warn" } }
    );
    expect(merged.categories).toEqual({ correctness: "error", style: "warn" });
  });

  it("merges rules per key with the delta winning", () => {
    const merged = mergeConfigs({ rules: { eqeqeq: "error", "no-var": "error" } }, { rules: { eqeqeq: "off" } });
    expect(merged.rules).toEqual({ eqeqeq: "off", "no-var": "error" });
  });

  it("appends overrides base first rather than replacing them", () => {
    const base: OxlintConfig = { overrides: [{ files: ["**/*.tsx"], rules: {} }] };
    const delta: OxlintConfig = { overrides: [{ files: ["**/*.test.ts"], rules: {} }] };
    expect(mergeConfigs(base, delta).overrides?.map(o => o.files)).toEqual([["**/*.tsx"], ["**/*.test.ts"]]);
  });

  it("keeps duplicate overrides, since order decides the winner", () => {
    const same = { files: ["**/*.tsx"], rules: {} };
    expect(mergeConfigs({ overrides: [same] }, { overrides: [same] }).overrides).toHaveLength(2);
  });

  it("does not mutate either input", () => {
    const base: OxlintConfig = { plugins: ["eslint"], rules: { eqeqeq: "error" }, overrides: [] };
    const delta: OxlintConfig = { plugins: ["react"], rules: { eqeqeq: "off" } };
    mergeConfigs(base, delta);
    expect(base).toEqual({ plugins: ["eslint"], rules: { eqeqeq: "error" }, overrides: [] });
    expect(delta).toEqual({ plugins: ["react"], rules: { eqeqeq: "off" } });
  });
});

describe("shortName", () => {
  it("strips the scope", () => {
    expect(shortName(moduleWith({ name: "unistyles" }))).toBe("unistyles");
  });

  it("keeps a hyphenated name intact", () => {
    expect(shortName(moduleWith({ name: "legend-state" }))).toBe("legend-state");
  });
});

describe("composeModules", () => {
  it("enables every rule of an always-on module", () => {
    const composed = composeModules([moduleWith({ name: "core", rules: { a: rule("A."), b: rule("B.") } })], {});
    expect(composed.rules).toEqual({ "@ashstack/core/a": "error", "@ashstack/core/b": "error" });
  });

  it("loads the module's plugin file once", () => {
    const composed = composeModules([moduleWith({ name: "core" })], {});
    expect(composed.jsPlugins).toEqual([herePath]);
  });

  it("skips a module whose option is false, dependency or not", () => {
    const composed = composeModules([moduleWith({ name: "zod", option: "zod" })], { zod: false });
    expect(composed.rules).toEqual({});
    expect(composed.jsPlugins).toEqual([]);
  });

  it("enables a module whose option is true despite a missing dependency", () => {
    const composed = composeModules([moduleWith({ name: "skia", option: "skia", packages: ["nope-not-installed"] })], {
      skia: true,
    });
    expect(Object.keys(composed.rules)).toEqual(["@ashstack/skia/a-rule"]);
  });

  it("skips a module whose package is absent and whose option is unset", () => {
    const composed = composeModules(
      [moduleWith({ name: "skia", option: "skia", packages: ["nope-not-installed"] })],
      {}
    );
    expect(composed.rules).toEqual({});
  });

  it("ignores an option key that belongs to another module", () => {
    const composed = composeModules([moduleWith({ name: "skia", option: "skia", packages: ["nope-not-installed"] })], {
      unistyles: true,
    });
    expect(composed.rules).toEqual({});
  });

  it("leaves a defaultOff rule out", () => {
    const rules = { on: rule("On."), off: rule("Off.", { defaultOff: true }) };
    expect(Object.keys(composeModules([moduleWith({ name: "core", rules })], {}).rules)).toEqual(["@ashstack/core/on"]);
  });

  it("leaves out a rule gated on a package that is not installed", () => {
    const rules = { plain: rule("Plain."), gated: rule("Gated.", { packages: ["nope-not-installed"] }) };
    expect(Object.keys(composeModules([moduleWith({ name: "core", rules })], {}).rules)).toEqual([
      "@ashstack/core/plain",
    ]);
  });

  it("does not load a plugin for a module whose every rule is off", () => {
    const rules = { off: rule("Off.", { defaultOff: true }) };
    expect(composeModules([moduleWith({ name: "core", rules })], {}).jsPlugins).toEqual([]);
  });

  it("does not load a plugin for a module with no rules at all", () => {
    expect(composeModules([moduleWith({ name: "keyboard", rules: {} })], {}).jsPlugins).toEqual([]);
  });

  it("still collects the import bans of a rules-less module", () => {
    const module = moduleWith({
      name: "keyboard",
      rules: {},
      restrictedImports: { paths: [{ name: "react-native", importNames: ["KeyboardAvoidingView"], message: "No." }] },
    });
    expect(composeModules([module], {}).restricted.paths).toHaveLength(1);
  });

  it("drops the import bans of a disabled module", () => {
    const module = moduleWith({
      name: "keyboard",
      rules: {},
      option: "keyboard",
      restrictedImports: { paths: [{ name: "react-native", importNames: ["KeyboardAvoidingView"], message: "No." }] },
    });
    expect(composeModules([module], { keyboard: false }).restricted.paths).toEqual([]);
  });

  it("concatenates bans from several modules", () => {
    const one = moduleWith({ name: "a", restrictedImports: { paths: [{ name: "x", message: "no x" }] } });
    const two = moduleWith({
      name: "b",
      restrictedImports: { patterns: [{ group: ["y/*"], message: "no y" }] },
    });
    const composed = composeModules([one, two], {});
    expect(composed.restricted.paths).toHaveLength(1);
    expect(composed.restricted.patterns).toHaveLength(1);
  });

  it("starts from empty ban lists", () => {
    expect(composeModules([moduleWith({ name: "a" })], {}).restricted).toEqual({ paths: [], patterns: [] });
  });

  it("adds a ban group whose package is installed", () => {
    const group: BanGroup = {
      packages: ["oxlint"],
      restrictedImports: { paths: [{ name: "crypto-js", message: "slow" }] },
    };
    expect(composeModules([], {}, [group]).restricted.paths).toHaveLength(1);
  });

  it("skips a ban group whose package is absent", () => {
    const group: BanGroup = {
      packages: ["nope-not-installed"],
      restrictedImports: { paths: [{ name: "crypto-js", message: "slow" }] },
    };
    expect(composeModules([], {}, [group]).restricted.paths).toEqual([]);
  });

  it("takes no ban groups as no bans", () => {
    expect(composeModules([moduleWith({ name: "a" })], {}).restricted.paths).toEqual([]);
  });

  it("keeps module order in the rule map and plugin list", () => {
    const composed = composeModules([moduleWith({ name: "first" }), moduleWith({ name: "second", url: here })], {});
    expect(Object.keys(composed.rules)).toEqual(["@ashstack/first/a-rule", "@ashstack/second/a-rule"]);
  });
});

describe("defineModule", () => {
  it("returns the manifest unchanged", () => {
    const manifest = { meta: { name: "@ashstack/x" as const }, rules: {}, url: here, docsWhen: "always on" };
    expect(defineModule(manifest)).toBe(manifest);
  });
});
