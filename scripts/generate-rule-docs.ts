import { existsSync, readdirSync, readFileSync } from "node:fs";
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
import { anchor, effectsModule, emit, type Generated, RULES_URL, ruleNotes } from "./shared.js";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const outPath = join(lintDir, "RULES.md");

const OXLINT_RULE_DOCS = "https://oxc.rs/docs/guide/usage/linter/rules";
const linkedRuleId = (ruleId: string): string => {
  const [plugin = "eslint", rule = ruleId] = ruleId.includes("/") ? ruleId.split("/") : ["eslint", ruleId];
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

const activationNotes = (meta: Rule["meta"]): string[] => [
  ...ruleNotes(meta).flatMap(note => [`> ${note}`, ""]),
  ...(meta.schema ? ["**Options**", "", "```jsonc", JSON.stringify(meta.schema, null, 2), "```", ""] : []),
];

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
const reactDocsModules = [...reactModules, await effectsModule()];
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
  ...tocFor("react()", reactDocsModules),
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
    summary:
      "React on the web. Adds the you-might-not-need-an-effect rules as `@ashstack/effects/`, alongside oxlint's own react plugin.",
    config: reactConfig,
    inherited: builtInRules(coreConfig),
    modules: reactDocsModules,
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
    // what: the bullets start their own lines, or the marker opens an HTML block that eats the `**`
    [
      "",
      "",
      `- **${counts.core} rules** on plain TypeScript, **${counts.react}** with React, **${counts.reactNative}** on React Native, ${counts.custom} of them custom-built`,
      `- library-specific rules ship only when you depend on that library: ${counts.detecting} self-detecting modules`,
    ].join("\n"),
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

const headingAnchors = (text: string): Set<string> =>
  new Set(
    text
      .split("\n")
      .filter(line => line.startsWith("#"))
      .map(line => anchor(line.replace(/^#+\s*/, "")))
  );

const RULES_LINK = new RegExp(`${RULES_URL.replaceAll(".", "\\.")}#([a-z0-9-]+)`, "g");
const ANY_RULES_LINK = /RULES\.md#/g;

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });

interface Link {
  path: string;
  target: string;
}

/**
 * Every RULES.md link the package's own types carry, generated or hand-written.
 * JSDoc cannot interpolate, so each link repeats the base URL; a link that
 * spells the base differently is counted but not returned, and the caller
 * fails on the difference rather than skipping it.
 */
const linksIn = (paths: string[]): { links: Link[]; total: number } => {
  const links: Link[] = [];
  let total = 0;
  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    total += [...text.matchAll(ANY_RULES_LINK)].length;
    for (const [, target = ""] of text.matchAll(RULES_LINK)) links.push({ path, target });
  }
  return { links, total };
};

const anchors = headingAnchors(doc);
const { links, total } = linksIn(sources(join(lintDir, "src")));

if (links.length !== total) {
  console.error(`${total - links.length} RULES.md link(s) do not start with ${RULES_URL} - use that exact base.`);
  process.exit(1);
}

const broken = links.filter(link => !anchors.has(link.target));
if (broken.length > 0) {
  console.error("RULES.md links pointing at no section:");
  for (const { path, target } of broken) console.error(`  - #${target} in ${path}`);
  process.exit(1);
}

/** A README with its counts sentence spliced back between the markers. */
const counted = ([path, sentence]: [string, string]): Generated => {
  const updated = withCounts(readFileSync(path, "utf8"), sentence);
  if (updated === null) throw new Error(`${path} lost its ${START} markers - put them back around the counts.`);
  return [path, updated];
};

emit([[outPath, doc], ...countedReadmes.map(counted)], "rule docs", "bun run docs:rules");
