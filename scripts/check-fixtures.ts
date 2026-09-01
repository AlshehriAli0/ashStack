import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { coreModules, reactModules, reactNativeModules } from "../packages/lint/dist/index.js";
import { shortName } from "../packages/lint/dist/lib/module.js";
import type { ModuleManifest } from "../packages/lint/dist/lib/types.js";

const repoRoot = join(import.meta.dir, "..");
const lintDir = join(repoRoot, "packages", "lint");
const fixturesDir = join(lintDir, "fixtures");
const oxlint = join(repoRoot, "node_modules", ".bin", "oxlint");

const failures: string[] = [];
const allModules = [...coreModules, ...reactModules, ...reactNativeModules];
const moduleByFixtureDir = new Map(allModules.map(module => [shortName(module), module]));

const subdirectoriesOf = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

const settingFor = (ruleDir: string): unknown => {
  const optionsPath = join(ruleDir, "options.json");
  return existsSync(optionsPath) ? JSON.parse(readFileSync(optionsPath, "utf8")) : "error";
};

const lintFixtures = (module: ModuleManifest, moduleDir: string, rules: string[]) => {
  const configPath = join(tmpdir(), `ashstack-fixture-${shortName(module)}.json`);
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: "off", suspicious: "off", perf: "off" },
      jsPlugins: [fileURLToPath(module.url)],
      rules: Object.fromEntries(rules.map(rule => [`${module.meta.name}/${rule}`, settingFor(join(moduleDir, rule))])),
    })
  );

  const run = Bun.spawnSync([oxlint, "-c", configPath, "--format", "json", moduleDir], { cwd: repoRoot });
  rmSync(configPath, { force: true });

  try {
    return JSON.parse(run.stdout.toString()).diagnostics ?? [];
  } catch {
    const output = run.stdout.toString().slice(0, 400);
    failures.push(
      `${shortName(module)}: could not parse oxlint output: ${output} ${run.stderr.toString().slice(0, 400)}`
    );
    return null;
  }
};

const fixtureDirs = subdirectoriesOf(fixturesDir);

for (const fixtureDir of fixtureDirs) {
  const module = moduleByFixtureDir.get(fixtureDir);
  if (!module) {
    failures.push(`${fixtureDir}: fixture dir has no module in the registry`);
    continue;
  }

  const moduleDir = join(fixturesDir, fixtureDir);
  const rulesWithFixtures = subdirectoriesOf(moduleDir);

  for (const rule of rulesWithFixtures) {
    if (!(rule in module.rules)) failures.push(`${fixtureDir}/${rule}: fixture dir has no such rule in the module`);
  }
  for (const rule of Object.keys(module.rules)) {
    if (!rulesWithFixtures.includes(rule)) failures.push(`${fixtureDir}/${rule}: rule has no fixture dir`);
  }

  const diagnostics: { filename?: string; code?: string }[] | null = lintFixtures(module, moduleDir, rulesWithFixtures);
  if (!diagnostics) continue;

  for (const rule of rulesWithFixtures) {
    const timesFiredIn = (fixture: string) =>
      diagnostics.filter(d => {
        const file = d.filename ?? "";
        const code = d.code ?? "";
        return (
          file.includes(`fixtures/${fixtureDir}/${rule}/`) &&
          file.includes(`/${fixture}.`) &&
          (code.includes(`${module.meta.name}(${rule})`) || code.includes(`${module.meta.name}/${rule}`))
        );
      }).length;
    if (timesFiredIn("bad") === 0) failures.push(`${fixtureDir}/${rule}: bad fixture did not fire`);
    if (timesFiredIn("good") > 0) failures.push(`${fixtureDir}/${rule}: good fixture fired`);
  }
}

for (const module of allModules) {
  if (!fixtureDirs.includes(shortName(module))) failures.push(`${shortName(module)}: module has no fixtures dir`);
}

if (failures.length > 0) {
  const listed = failures.map(f => `  - ${f}`).join("\n");
  console.error(`FIXTURE FAILURES (${failures.length}):\n${listed}`);
  process.exit(1);
}
console.log(`fixtures ok: ${fixtureDirs.length} modules checked`);
