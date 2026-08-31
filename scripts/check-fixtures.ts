// Fixture gate: for every packages/lint/fixtures/<namespace>/<rule>/, bad.* must fire
// <namespace>/<rule> at least once and good.* must never fire it. A rule dir may
// carry options.json when the rule needs configuration to fire.
import { existsSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const fixturesDir = join(lintDir, "fixtures");
const oxlint = join(import.meta.dir, "..", "node_modules", ".bin", "oxlint");

// fixture module dir -> plugin file (relative to packages/lint).
// Rule ids are `@ashstack/<module>/<rule>`.
const PLUGIN_FILES: Record<string, string> = {
  core: "src/core/rules/base.js",
  zod: "src/core/rules/zod.js",
  query: "src/react/rules/query.js",
  zustand: "src/react/rules/zustand.js",
  i18n: "src/react/rules/i18n.js",
  "react-native": "src/react-native/rules/base.js",
  unistyles: "src/react-native/rules/unistyles.js",
  "legend-list": "src/react-native/rules/legend-list.js",
  "legend-state": "src/react-native/rules/legend-state.js",
  reanimated: "src/react-native/rules/reanimated.js",
  "turbo-image": "src/react-native/rules/turbo-image.js",
  skia: "src/react-native/rules/skia.js",
  keyboard: "src/react-native/rules/keyboard.js",
};

const failures: string[] = [];

const domains = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const domain of domains) {
  const pluginFile = PLUGIN_FILES[domain];
  if (!pluginFile) {
    failures.push(`${domain}: no plugin file mapped in check-fixtures.ts`);
    continue;
  }
  const domainDir = join(fixturesDir, domain);
  const rules = readdirSync(domainDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const configPath = join(lintDir, `.fixture-check-${domain}.json`);
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: "off", suspicious: "off", perf: "off" },
      jsPlugins: [`./${pluginFile}`],
      rules: Object.fromEntries(
        rules.map(rule => {
          const optionsPath = join(domainDir, rule, "options.json");
          const config = existsSync(optionsPath) ? JSON.parse(readFileSync(optionsPath, "utf8")) : "error";
          return [`@ashstack/${domain}/${rule}`, config];
        })
      ),
    })
  );

  const proc = Bun.spawnSync([oxlint, "-c", configPath, "--format", "json", domainDir]);
  const stdout = proc.stdout.toString();
  rmSync(configPath);

  let diagnostics: { filename?: string; code?: string; message?: string }[] = [];
  try {
    diagnostics = JSON.parse(stdout).diagnostics ?? [];
  } catch {
    failures.push(
      `${domain}: could not parse oxlint output: ${stdout.slice(0, 400)} ${proc.stderr.toString().slice(0, 400)}`
    );
    continue;
  }

  for (const rule of rules) {
    const hits = (file: string) =>
      diagnostics.filter(
        d =>
          d.filename?.includes(`fixtures/${domain}/${rule}/`) &&
          d.filename?.includes(`/${file}.`) &&
          (d.code?.includes(`@ashstack/${domain}(${rule})`) || d.code?.includes(`@ashstack/${domain}/${rule}`))
      ).length;
    if (hits("bad") === 0) failures.push(`${domain}/${rule}: bad fixture did not fire`);
    if (hits("good") > 0) failures.push(`${domain}/${rule}: good fixture fired`);
  }
}

if (failures.length > 0) {
  console.error(`FIXTURE FAILURES (${failures.length}):\n` + failures.map(f => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`fixtures ok: ${domains.length} domains checked`);
