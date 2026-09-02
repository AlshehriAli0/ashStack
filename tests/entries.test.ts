import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  banGroups,
  core,
  coreModules,
  react,
  reactModules,
  reactNative,
  reactNativeModules,
} from "../packages/lint/dist/index.js";
import { EFFECT_NAMESPACE } from "../packages/lint/dist/lib/effect-plugin.js";
import { shortName } from "../packages/lint/dist/lib/module.js";
import type { ModuleManifest, OxlintConfig, ReactNativeOptions } from "../packages/lint/dist/lib/types.js";

const ALL_MODULES = [...coreModules, ...reactModules, ...reactNativeModules];
const FIXTURES = join(import.meta.dir, "..", "packages", "lint", "fixtures");

const ALL_ON: Required<ReactNativeOptions> = {
  zod: true,
  query: true,
  zustand: true,
  i18n: true,
  tailwind: true,
  tanstackRouter: true,
  unistyles: true,
  legendList: true,
  legendState: true,
  reanimated: true,
  turboImage: true,
  skia: true,
  keyboard: true,
};
const ALL_OFF = Object.fromEntries(Object.keys(ALL_ON).map(key => [key, false]));

const ruleIds = (config: OxlintConfig): string[] => Object.keys(config.rules ?? {});
const customIds = (config: OxlintConfig): string[] => ruleIds(config).filter(id => id.startsWith("@ashstack/"));
/** Rules written in this repo. The vendored effect plugin wears our namespace without being one of our modules. */
const ourIds = (config: OxlintConfig): string[] =>
  customIds(config).filter(id => !id.startsWith(`${EFFECT_NAMESPACE}/`));
const namespaceOf = (id: string): string => id.slice(0, id.lastIndexOf("/"));

describe("the module registry", () => {
  it("has a unique name per module", () => {
    const names = ALL_MODULES.map(module => module.meta.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has a unique option key per module that has one", () => {
    const options = ALL_MODULES.map(module => module.option).filter(option => option !== undefined);
    expect(new Set(options).size).toBe(options.length);
  });

  it("only uses option keys the ReactNativeOptions type declares", () => {
    for (const module of ALL_MODULES) {
      if (module.option !== undefined) expect(Object.keys(ALL_ON)).toContain(module.option);
    }
  });

  it("scopes every module name", () => {
    for (const module of ALL_MODULES) expect(module.meta.name).toMatch(/^@ashstack\/[a-z][a-z\d-]*$/);
  });

  it("gives every module an activation line for the docs", () => {
    for (const module of ALL_MODULES) expect(module.docsWhen.length).toBeGreaterThan(0);
  });

  it("names every rule in kebab-case", () => {
    for (const module of ALL_MODULES) {
      for (const name of Object.keys(module.rules)) expect(name).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    }
  });

  it("gives every rule a description that reads as a sentence", () => {
    for (const module of ALL_MODULES) {
      for (const [name, rule] of Object.entries(module.rules)) {
        const { description } = rule.meta.docs;
        expect(`${module.meta.name}/${name}: ${description}`).toMatch(/: [`A-Z].*\.$/s);
      }
    }
  });

  it("marks every rule as a problem or a suggestion", () => {
    for (const module of ALL_MODULES) {
      for (const rule of Object.values(module.rules))
        expect(["problem", "suggestion"]).toContain(String(rule.meta.type));
    }
  });

  it("gives every rule either create or createOnce, never both", () => {
    for (const module of ALL_MODULES) {
      for (const [name, rule] of Object.entries(module.rules)) {
        const shape = { create: "create" in rule, createOnce: "createOnce" in rule };
        expect(`${name} ${JSON.stringify(shape)}`).toMatch(/(true,"createOnce":false|false,"createOnce":true)/);
      }
    }
  });

  it("gives every restricted path a message", () => {
    for (const module of ALL_MODULES) {
      for (const path of module.restrictedImports?.paths ?? []) expect(path.message.length).toBeGreaterThan(0);
    }
    for (const group of banGroups) {
      for (const path of group.restrictedImports.paths ?? []) expect(path.message.length).toBeGreaterThan(0);
    }
  });

  it("gates every ban group on at least one package", () => {
    for (const group of banGroups) expect(group.packages.length).toBeGreaterThan(0);
  });

  it("has a bad and a good fixture for every rule, and no fixture without a rule", () => {
    const wanted = ALL_MODULES.flatMap(module =>
      Object.keys(module.rules).flatMap(name => [
        `${shortName(module)}/${name}/bad.tsx`,
        `${shortName(module)}/${name}/good.tsx`,
      ])
    );
    expect(wanted.filter(relative => !existsSync(join(FIXTURES, relative)))).toEqual([]);
  });
});

describe("entry layering", () => {
  it("gives react every rule core sets", () => {
    expect(ruleIds(react())).toEqual(expect.arrayContaining(ruleIds(core())));
  });

  it("gives react-native every rule react sets", () => {
    expect(ruleIds(reactNative())).toEqual(expect.arrayContaining(ruleIds(react())));
  });

  it("gives react every plugin core loads", () => {
    expect(react().plugins).toEqual(expect.arrayContaining(core().plugins ?? []));
  });

  it("adds react and jsx-a11y at the react entry", () => {
    expect(react().plugins).toEqual(expect.arrayContaining(["react", "jsx-a11y"]));
    expect(core().plugins).not.toContain("react");
  });

  it("accumulates overrides rather than replacing them", () => {
    expect((reactNative().overrides ?? []).length).toBeGreaterThan((react().overrides ?? []).length);
    expect((react().overrides ?? []).length).toBeGreaterThan((core().overrides ?? []).length);
  });

  it("adds the __DEV__ global only at the react-native entry", () => {
    expect(reactNative().globals).toMatchObject({ __DEV__: "readonly" });
    expect(react().globals?.__DEV__).toBeUndefined();
  });

  it("configures import bans only at the react-native entry", () => {
    expect(reactNative().rules?.["no-restricted-imports"]).toBeDefined();
    expect(react().rules?.["no-restricted-imports"]).toBeUndefined();
    expect(core().rules?.["no-restricted-imports"]).toBeUndefined();
  });

  it("ignores native build output only at the react-native entry", () => {
    expect(reactNative().ignorePatterns).toEqual(["**/.expo/**", "**/android/**", "**/ios/**"]);
    expect(react().ignorePatterns).toBeUndefined();
  });

  it("loads no duplicate plugin file", () => {
    const plugins = (reactNative(ALL_ON).jsPlugins ?? []).map(plugin => JSON.stringify(plugin));
    expect(new Set(plugins).size).toBe(plugins.length);
  });
});

describe("entry purity", () => {
  it.each([
    ["core", core],
    ["react", react],
    ["react-native", reactNative],
  ])("gives %s the same config on every call", (_name, entry) => {
    expect(entry(ALL_ON)).toEqual(entry(ALL_ON));
  });

  it("is unaffected by a caller mutating a previous result", () => {
    const first = reactNative(ALL_ON);
    first.rules!.eqeqeq = "off";
    (first.plugins as string[]).push("bogus");
    expect(reactNative(ALL_ON).rules?.eqeqeq).not.toBe("off");
    expect(reactNative(ALL_ON).plugins).not.toContain("bogus");
  });
});

describe("module toggles", () => {
  it("turns every library namespace off together", () => {
    const namespaces = new Set(ourIds(reactNative(ALL_OFF)).map(namespaceOf));
    expect([...namespaces].toSorted()).toEqual(["@ashstack/core", "@ashstack/react", "@ashstack/react-native"]);
  });

  it("turns every library namespace on together", () => {
    const namespaces = new Set(ourIds(reactNative(ALL_ON)).map(namespaceOf));
    for (const module of ALL_MODULES) {
      if (Object.keys(module.rules).length > 0) expect(namespaces).toContain(module.meta.name);
    }
  });

  it("turns one module off without touching the others", () => {
    const withoutUnistyles = customIds(reactNative({ ...ALL_ON, unistyles: false })).map(namespaceOf);
    expect(withoutUnistyles).not.toContain("@ashstack/unistyles");
    expect(withoutUnistyles).toContain("@ashstack/reanimated");
  });

  it("drops a module's import bans along with its rules", () => {
    const [, withoutUnistyles] = reactNative({ ...ALL_ON, unistyles: false }).rules!["no-restricted-imports"] as [
      string,
      { paths: { name: string }[] },
    ];
    const [, withUnistyles] = reactNative(ALL_ON).rules!["no-restricted-imports"] as [
      string,
      { paths: { name: string }[] },
    ];
    expect(withoutUnistyles.paths.length).toBeLessThan(withUnistyles.paths.length);
  });

  it("keeps a module's rules out of the react entry when the module is react-native only", () => {
    expect(customIds(react(ALL_ON)).map(namespaceOf)).not.toContain("@ashstack/unistyles");
  });

  it("leaves every defaultOff rule out of the default config", () => {
    const enabled = new Set(customIds(reactNative(ALL_ON)));
    for (const module of ALL_MODULES) {
      for (const [name, rule] of Object.entries(module.rules)) {
        if (rule.meta.defaultOff) expect(enabled).not.toContain(`${module.meta.name}/${name}`);
      }
    }
  });

  it("sets every enabled custom rule to error", () => {
    const rules = reactNative(ALL_ON).rules ?? {};
    for (const id of ourIds(reactNative(ALL_ON))) expect(rules[id]).toBe("error");
  });

  it("gives every custom rule id a namespace matching its module", () => {
    // what: `@ashstack/effects` is the vendored plugin registered under our namespace, not a module of ours
    const moduleNames: string[] = [EFFECT_NAMESPACE, ...ALL_MODULES.map((module: ModuleManifest) => module.meta.name)];
    for (const id of ourIds(reactNative(ALL_ON))) {
      expect(moduleNames).toContain(namespaceOf(id));
    }
  });
});
