// Generates packages/lint/RULES.md from the built module registry: each rule's
// meta.docs.description, meta.schema (options), activation, and its bad/good
// fixtures as examples. Run with --check in CI to fail when the file is stale
// or a rule is missing its description. Run `bun run build` first.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { banGroups, core, react, reactNative } from "../packages/lint/dist/index.js";
import { allModules, shortName } from "../packages/lint/dist/lib/registry.js";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const outPath = join(lintDir, "RULES.md");
const check = process.argv.includes("--check");

const fixture = (module: string, rule: string, file: string) => {
  for (const ext of [".tsx", ".ts"]) {
    const p = join(lintDir, "fixtures", module, rule, `${file}${ext}`);
    if (existsSync(p)) return readFileSync(p, "utf8").trim();
  }
  return null;
};

const failures: string[] = [];
const toc: string[] = [];
const body: string[] = [];

for (const module of allModules) {
  const dir = shortName(module);
  const names = Object.keys(module.rules);
  toc.push(
    `- [\`${module.meta.name}\`](#${module.meta.name.replace(/[@/]/g, "").replace(/-/g, "")}) — ${names.length} rule${names.length > 1 ? "s" : ""}`
  );
  body.push(`## \`${module.meta.name}\`\n`, `_${module.docsWhen}._\n`);

  const bans = module.restrictedImports;
  if (bans) {
    const lines = [
      ...(bans.paths ?? []).map(p => `- \`${(p.importNames ?? ["*"]).join("`, `")}\` from \`${p.name}\``),
      ...(bans.patterns ?? []).map(p => `- any import of \`${p.group.join("`, `")}\``),
    ];
    body.push(`**Import bans that ship with this module**\n\n${lines.join("\n")}\n`);
  }

  for (const name of names) {
    const rule = module.rules[name];
    const description = rule.meta?.docs?.description;
    if (!description) failures.push(`${module.meta.name}/${name}: missing meta.docs.description`);

    body.push(`### \`${module.meta.name}/${name}\`\n`, `${description ?? "_undocumented_"}\n`);
    if (rule.meta?.defaultOff) body.push(`> Off by default — opt in per project.\n`);
    if (rule.meta?.packages) {
      body.push(`> Enabled only when one of ${rule.meta.packages.map(p => `\`${p}\``).join(", ")} is a dependency.\n`);
    }
    if (rule.meta?.schema) {
      body.push("**Options**\n\n```jsonc\n" + JSON.stringify(rule.meta.schema, null, 2) + "\n```\n");
    }

    const bad = fixture(dir, name, "bad");
    const good = fixture(dir, name, "good");
    if (bad) body.push(`**Fails**\n\n\`\`\`tsx\n${bad}\n\`\`\`\n`);
    if (good) body.push(`**Passes**\n\n\`\`\`tsx\n${good}\n\`\`\`\n`);
  }
}

// ---------------------------------------------------------------------------
// Built-in configuration per entry, rendered as deltas (react() contains
// core(), react-native() contains react()). Module toggles are forced off so
// the tables stay deterministic regardless of this repo's own dependencies.
const ALL_OFF = {
  zod: false,
  query: false,
  zustand: false,
  i18n: false,
  unistyles: false,
  legendList: false,
  legendState: false,
  reanimated: false,
  turboImage: false,
  skia: false,
  keyboard: false,
};

const builtinRules = (config: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(config.rules as Record<string, unknown>).filter(
      ([id]) => !id.startsWith("@ashstack/") && id !== "no-restricted-imports"
    )
  );

const settingsTable = (rules: Record<string, unknown>, baseline: Record<string, unknown>): string => {
  const rows = Object.entries(rules)
    .filter(([id, setting]) => JSON.stringify(baseline[id]) !== JSON.stringify(setting))
    .map(([id, setting]) => `| \`${id}\` | \`${JSON.stringify(setting)}\` |`);
  return ["| Rule | Setting |", "| --- | --- |", ...rows].join("\n");
};

const coreConfig = core(ALL_OFF);
const reactConfig = react(ALL_OFF);
const reactNativeConfig = reactNative(ALL_OFF);

const entrySections = [
  "## Entry configuration (built-in rules)",
  "",
  "What each entry sets beyond the custom modules — oxlint built-ins are documented at https://oxc.rs/docs/guide/usage/linter/rules.html. Each table shows only what changed relative to the previous entry.",
  "",
  "### `core()`",
  "",
  `Plugins: ${(coreConfig.plugins as string[]).map(p => `\`${p}\``).join(", ")}. Categories: \`${JSON.stringify(coreConfig.categories)}\`.`,
  "",
  settingsTable(builtinRules(coreConfig), {}),
  "",
  "### `react()` — changes on top of `core()`",
  "",
  `Adds plugins: ${(reactConfig.plugins as string[])
    .filter(p => !(coreConfig.plugins as string[]).includes(p))
    .map(p => `\`${p}\``)
    .join(", ")}, plus the you-might-not-need-an-effect js-plugin (\`react-effect/\`).`,
  "",
  settingsTable(builtinRules(reactConfig), builtinRules(coreConfig)),
  "",
  "### `react-native()` — changes on top of `react()`",
  "",
  settingsTable(builtinRules(reactNativeConfig), builtinRules(reactConfig)),
  "",
  "### Auto-detected import bans (no module of their own)",
  "",
  ...banGroups.map(group => {
    const bans = [
      ...(group.restrictedImports.paths ?? []).map(
        p => `\`${(p.importNames ?? ["*"]).join("`, `")}\` from \`${p.name}\``
      ),
      ...(group.restrictedImports.patterns ?? []).map(p => `any import of \`${p.group.join("`, `")}\``),
    ];
    return `- when \`${group.packages.join("` / `")}\` is a dependency: ban ${bans.join("; ")}`;
  }),
  "",
].join("\n");

const doc = [
  "<!-- GENERATED by scripts/generate-rule-docs.ts - do not edit by hand. `bun run docs:rules` regenerates it. -->",
  "",
  "# @ashstack/lint — rules",
  "",
  "Everything this package ships, generated from the modules' own metadata, the entries, and the fixtures.",
  "",
  'Disable any rule by its full id in your `rules` block, e.g. `"@ashstack/unistyles/no-margin": "off"`.',
  "",
  ...toc,
  "- [Entry configuration (built-in rules)](#entry-configuration-built-in-rules)",
  "",
  ...body,
  entrySections,
].join("\n");

if (failures.length > 0) {
  console.error(`RULE DOC FAILURES (${failures.length}):\n` + failures.map(f => `  - ${f}`).join("\n"));
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
