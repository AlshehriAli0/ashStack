import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
import { shortName } from "../packages/lint/dist/lib/module.js";
import type {
  BanGroup,
  ModuleManifest,
  OxlintConfig,
  RestrictedImports,
  Rule,
} from "../packages/lint/dist/lib/types.js";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const outPath = join(lintDir, "RULES.md");
const check = process.argv.includes("--check");

const OXLINT_RULE_DOCS = "https://oxc.rs/docs/guide/usage/linter/rules";
const REACT_EFFECT_DOCS = "https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect";
const EVERY_MODULE_OFF = Object.fromEntries(
  [...coreModules, ...reactModules, ...reactNativeModules].filter(m => m.option).map(m => [m.option, false])
);

const failures: string[] = [];

const linkedRuleId = (ruleId: string): string => {
  const [plugin, rule] = ruleId.includes("/") ? ruleId.split("/") : ["eslint", ruleId];
  if (plugin === "react-effect") return `[\`${ruleId}\`](${REACT_EFFECT_DOCS})`;
  const pluginPath = (plugin as string).replace(/-/g, "_");
  return `[\`${ruleId}\`](${OXLINT_RULE_DOCS}/${pluginPath}/${rule}.html)`;
};

const builtInRules = (config: OxlintConfig): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(config.rules as Record<string, unknown>).filter(
      ([id]) => !id.startsWith("@ashstack/") && id !== "no-restricted-imports"
    )
  );

const builtInTable = (config: OxlintConfig, inherited: Record<string, unknown>): string[] => {
  const rows = Object.entries(builtInRules(config))
    .filter(([id, setting]) => JSON.stringify(inherited[id]) !== JSON.stringify(setting))
    .map(([id, setting]) => `| ${linkedRuleId(id)} | \`${JSON.stringify(setting)}\` |`);
  if (rows.length === 0) return ["_No built-in rule settings change here._", ""];
  return ["| Rule | Setting |", "| --- | --- |", ...rows, ""];
};

const banList = (bans: RestrictedImports): string[] => [
  ...(bans.paths ?? []).map(p => `- \`${(p.importNames ?? ["*"]).join("`, `")}\` from \`${p.name}\``),
  ...(bans.patterns ?? []).map(p => `- any import of \`${p.group.join("`, `")}\``),
];

const fixtureSource = (moduleDir: string, rule: string, fixture: "bad" | "good"): string | null => {
  for (const extension of [".tsx", ".ts"]) {
    const path = join(lintDir, "fixtures", moduleDir, rule, `${fixture}${extension}`);
    if (existsSync(path)) return readFileSync(path, "utf8").trim();
  }
  return null;
};

const activationNotes = (meta: Rule["meta"] | undefined): string[] => {
  const notes: string[] = [];
  if (meta?.defaultOff) notes.push("> Off by default — opt in per project.", "");
  if (meta?.packages) {
    notes.push(`> Enabled only when one of ${meta.packages.map(p => `\`${p}\``).join(", ")} is a dependency.`, "");
  }
  if (meta?.schema) notes.push("**Options**", "", "```jsonc", JSON.stringify(meta.schema, null, 2), "```", "");
  return notes;
};

const examples = (moduleDir: string, name: string): string[] => {
  const bad = fixtureSource(moduleDir, name, "bad");
  const good = fixtureSource(moduleDir, name, "good");
  return [
    ...(bad ? ["**Fails**", "", "```tsx", bad, "```", ""] : []),
    ...(good ? ["**Passes**", "", "```tsx", good, "```", ""] : []),
  ];
};

const ruleSection = (module: ModuleManifest, name: string): string[] => {
  const rule = module.rules[name];
  const description = rule.meta?.docs?.description;
  if (!description) failures.push(`${module.meta.name}/${name}: missing meta.docs.description`);

  return [
    `#### \`${module.meta.name}/${name}\``,
    "",
    description ?? "_undocumented_",
    "",
    ...activationNotes(rule.meta),
    ...examples(shortName(module), name),
  ];
};

const moduleSection = (module: ModuleManifest): string[] => {
  const lines = [`### \`${module.meta.name}\``, "", `_${module.docsWhen}._`, ""];
  if (module.restrictedImports) {
    lines.push("**Import bans that ship with this module**", "", ...banList(module.restrictedImports), "");
  }
  for (const name of Object.keys(module.rules)) lines.push(...ruleSection(module, name));
  return lines;
};

const banGroupSection = (groups: BanGroup[]): string[] => [
  "### Import bans without a module",
  "",
  "_Auto-detected from your dependencies; these carry no rules of their own._",
  "",
  ...groups.flatMap(group => [
    `**\`${group.packages.join("` / `")}\` installed**`,
    "",
    ...banList(group.restrictedImports),
    "",
  ]),
];

const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-");

interface Entry {
  entry: string;
  summary: string;
  config: OxlintConfig;
  inherited: Record<string, unknown>;
  modules: ModuleManifest[];
  extra?: string[];
}

const entrySection = ({ entry, summary, config, inherited, modules, extra = [] }: Entry): string[] => [
  `## \`${entry}\``,
  "",
  summary,
  "",
  `Plugins: ${(config.plugins as string[]).map(p => `\`${p}\``).join(", ")}.`,
  "",
  "### Built-in rules",
  "",
  ...builtInTable(config, inherited),
  ...modules.flatMap(moduleSection),
  ...extra,
];

const tocFor = (entry: string, modules: ModuleManifest[]): string[] => [
  `- [\`${entry}\`](#${anchor(entry)})`,
  ...modules.map(m => {
    const count = Object.keys(m.rules).length;
    return `  - [\`${m.meta.name}\`](#${anchor(m.meta.name)}) — ${count} rule${count === 1 ? "" : "s"}`;
  }),
];

const coreConfig = core(EVERY_MODULE_OFF);
const reactConfig = react(EVERY_MODULE_OFF);
const reactNativeConfig = reactNative(EVERY_MODULE_OFF);

const doc = [
  "<!-- GENERATED by scripts/generate-rule-docs.ts - do not edit by hand. `bun run docs:rules` regenerates it. -->",
  "",
  "# @ashstack/lint — rules",
  "",
  "Every rule these entries turn on, generated from the entries, the module manifests and the fixtures. Built-in oxlint rules link to their upstream page; the modules' own rules are documented in full here.",
  "",
  'Disable any rule by its id in your `rules` block, e.g. `"@ashstack/unistyles/no-margin": "off"`. Each entry contains the one before it, so its table lists only what it changes.',
  "",
  ...tocFor("core()", coreModules),
  ...tocFor("react()", reactModules),
  ...tocFor("react-native()", reactNativeModules),
  "",
  ...entrySection({
    entry: "core()",
    summary: "Any TypeScript project — backend, CLI, library.",
    config: coreConfig,
    inherited: {},
    modules: coreModules,
  }),
  ...entrySection({
    entry: "react()",
    summary: "React on the web. Adds the you-might-not-need-an-effect plugin (`react-effect/`) alongside oxlint's own.",
    config: reactConfig,
    inherited: builtInRules(coreConfig),
    modules: reactModules,
  }),
  ...entrySection({
    entry: "react-native()",
    summary: "Expo and React Native.",
    config: reactNativeConfig,
    inherited: builtInRules(reactConfig),
    modules: reactNativeModules,
    extra: banGroupSection(banGroups),
  }),
].join("\n");

if (failures.length > 0) {
  const listed = failures.map(f => `  - ${f}`).join("\n");
  console.error(`RULE DOC FAILURES (${failures.length}):\n${listed}`);
  process.exit(1);
}

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  if (current !== doc) {
    console.error("RULES.md is stale - run `bun run docs:rules` and commit the result.");
    process.exit(1);
  }
  console.log("rule docs ok");
} else {
  writeFileSync(outPath, doc);
  console.log(`wrote ${outPath}`);
}
