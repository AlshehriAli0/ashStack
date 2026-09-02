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
const linkedRuleId = (ruleId: string): string => {
  const [plugin = "eslint", rule = ruleId] = ruleId.includes("/") ? ruleId.split("/") : ["eslint", ruleId];
  if (plugin === "react-effect") return `[\`${ruleId}\`](${REACT_EFFECT_DOCS})`;
  const pluginPath = plugin.replace(/-/g, "_");
  return `[\`${ruleId}\`](${OXLINT_RULE_DOCS}/${pluginPath}/${rule}.html)`;
};

const builtInRules = (config: OxlintConfig): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(([id]) => !id.startsWith("@ashstack/") && id !== "no-restricted-imports")
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
  const path = join(lintDir, "fixtures", moduleDir, rule, `${fixture}.tsx`);
  return existsSync(path) ? readFileSync(path, "utf8").trim() : null;
};

const activationNotes = (meta: Rule["meta"]): string[] => {
  const notes: string[] = [];
  if (meta.defaultOff) notes.push("> Off by default — opt in per project.", "");
  if (meta.packages) {
    notes.push(`> Enabled only when one of ${meta.packages.map(p => `\`${p}\``).join(", ")} is a dependency.`, "");
  }
  if (meta.schema) notes.push("**Options**", "", "```jsonc", JSON.stringify(meta.schema, null, 2), "```", "");
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

const ruleSection = (module: ModuleManifest, name: string, rule: ModuleManifest["rules"][string]): string[] => [
  `#### \`${module.meta.name}/${name}\``,
  "",
  rule.meta.docs.description,
  "",
  ...activationNotes(rule.meta),
  ...examples(shortName(module), name),
];

const moduleSection = (module: ModuleManifest): string[] => {
  const lines = [`### \`${module.meta.name}\``, "", `_${module.docsWhen}._`, ""];
  if (module.restrictedImports) {
    lines.push("**Import bans that ship with this module**", "", ...banList(module.restrictedImports), "");
  }
  for (const [name, rule] of Object.entries(module.rules)) lines.push(...ruleSection(module, name, rule));
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
  `Plugins: ${(config.plugins ?? []).map(p => `\`${p}\``).join(", ")}.`,
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
    const summary = count === 0 ? "import bans only" : `${count} rule${count === 1 ? "" : "s"}`;
    return `  - [\`${m.meta.name}\`](#${anchor(m.meta.name)}) — ${summary}`;
  }),
];

/** Every module forced on, so a count does not depend on what the repo running this depends on. */
const allOn = (modules: ModuleManifest[]): Record<string, boolean> =>
  Object.fromEntries(modules.flatMap(m => (m.option === undefined ? [] : [[m.option, true]])));

const severityOf = (setting: unknown): string => {
  if (typeof setting === "string") return setting;
  return Array.isArray(setting) && typeof setting[0] === "string" ? setting[0] : "";
};

const enabledRules = (config: OxlintConfig): number =>
  Object.values(config.rules ?? {}).filter(setting => severityOf(setting) !== "off").length;

const customRules = (modules: ModuleManifest[]): number =>
  modules.reduce((total, m) => total + Object.values(m.rules).filter(rule => !rule.meta.defaultOff).length, 0);

const detectingModules = (modules: ModuleManifest[]): number =>
  modules.filter(m => (m.packages ?? []).length > 0).length;

const coreConfig = core();
const reactConfig = react();
const reactNativeConfig = reactNative();

const reactAll = [...coreModules, ...reactModules];
const reactNativeAll = [...reactAll, ...reactNativeModules];

const counts = {
  core: enabledRules(core(allOn(coreModules))),
  react: enabledRules(react(allOn(reactAll))),
  reactNative: enabledRules(reactNative(allOn(reactNativeAll))),
  custom: customRules(reactNativeAll),
  detecting: detectingModules(reactNativeAll),
};

/** On in a bare oxlint install, so listing them as ours would be a lie. */
const OXLINT_DEFAULT_PLUGINS = ["eslint", "typescript", "unicorn", "oxc"];

const backticked = (names: string[]): string => names.map(name => `\`${name}\``).join(", ");

const ourPlugins = [
  ...new Set([coreConfig, reactConfig, reactNativeConfig].flatMap(config => config.plugins ?? [])),
].filter(plugin => !OXLINT_DEFAULT_PLUGINS.includes(plugin));

const doc = [
  "<!-- GENERATED by scripts/generate-rule-docs.ts - do not edit by hand. `bun run docs:rules` regenerates it. -->",
  "",
  "# @ashstack/lint rules",
  "",
  "Find a rule by the id in its diagnostic, e.g. `@ashstack/unistyles/no-margin`. Each one lists what it enforces, its options, and a failing and a passing example. The diagnostic itself names the fix.",
  "",
  "`core()`, `react()` and `react-native()` each contain the one before, so a section's built-in table lists only the settings that entry changes. Built-in rules link to their upstream page.",
  "",
  'Turn any rule off by id in your own `rules` block: `"@ashstack/unistyles/no-margin": "off"`.',
  "",
  `Each entry lists the oxlint plugins it turns on, below. You never need to add them: your own \`plugins\` array is added to the entry's set, not swapped for it. A bare oxlint install runs ${backticked(OXLINT_DEFAULT_PLUGINS)}; ${backticked(ourPlugins)} come from here.`,
  "",
  `Counting what each entry sets with every module on: **${counts.core}** rules for plain TypeScript, **${counts.react}** with React, **${counts.reactNative}** on React Native, ${counts.custom} of them written for this package. oxlint's own \`correctness\` category runs alongside these.`,
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

const START = "<!-- rule-counts -->";
const END = "<!-- /rule-counts -->";

/** The counts sentence each README carries between its markers. */
const countedReadmes: [path: string, sentence: string][] = [
  [
    join(import.meta.dir, "..", "README.md"),
    `**${counts.core} rules** on plain TypeScript, **${counts.react}** with React, **${counts.reactNative}** on React Native, ${counts.custom} of them custom-built
- library-specific rules ship only when you depend on that library: ${counts.detecting} self-detecting modules`,
  ],
  [
    join(lintDir, "README.md"),
    `${counts.core} rules on plain TypeScript, ${counts.react} with React, ${counts.reactNative} on React Native, ${counts.custom} of them custom-built`,
  ],
];

/** The file with `sentence` between the markers, or null when the markers are missing. */
const withCounts = (text: string, sentence: string): string | null => {
  const from = text.indexOf(START);
  const to = text.indexOf(END, from);
  if (from === -1 || to === -1) return null;
  return text.slice(0, from + START.length) + sentence + text.slice(to);
};

const stale: string[] = [];

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  if (current !== doc) stale.push("RULES.md");
  for (const [path, sentence] of countedReadmes) {
    const text = readFileSync(path, "utf8");
    if (withCounts(text, sentence) !== text) stale.push(path);
  }
  if (stale.length > 0) {
    console.error(`stale, run \`bun run docs:rules\` and commit the result: ${stale.join(", ")}`);
    process.exit(1);
  }
  console.log("rule docs ok");
} else {
  writeFileSync(outPath, doc);
  console.log(`wrote ${outPath}`);
  for (const [path, sentence] of countedReadmes) {
    const updated = withCounts(readFileSync(path, "utf8"), sentence);
    if (updated === null) throw new Error(`${path} lost its ${START} markers - put them back around the counts.`);
    writeFileSync(path, updated);
    console.log(`counts in ${path}`);
  }
}
