// Fixture gate: for every packages/lint/fixtures/<module>/<rule>/, bad.* must fire
// @ashstack/<module>/<rule> at least once and good.* must never fire it. Modules
// come from the built registry (run `bun run build` first); a rule dir may carry
// options.json when the rule needs configuration to fire.
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { allModules, shortName } from "../packages/lint/dist/lib/registry.js";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const fixturesDir = join(lintDir, "fixtures");
const oxlint = join(import.meta.dir, "..", "node_modules", ".bin", "oxlint");

const failures: string[] = [];
const modulesByDir = new Map(allModules.map(m => [shortName(m), m]));

const fixtureDirs = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const dirName of fixtureDirs) {
  const module = modulesByDir.get(dirName);
  if (!module) {
    failures.push(`${dirName}: fixture dir has no module in the registry`);
    continue;
  }
  const domainDir = join(fixturesDir, dirName);
  const rules = readdirSync(domainDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const rule of rules) {
    if (!(rule in module.rules)) failures.push(`${dirName}/${rule}: fixture dir has no such rule in the module`);
  }
  for (const rule of Object.keys(module.rules)) {
    if (!rules.includes(rule)) failures.push(`${dirName}/${rule}: rule has no fixture dir`);
  }

  const configPath = join(tmpdir(), `ashstack-fixture-${dirName}.json`);
  writeFileSync(
    configPath,
    JSON.stringify({
      plugins: [],
      categories: { correctness: "off", suspicious: "off", perf: "off" },
      jsPlugins: [fileURLToPath(module.url)],
      rules: Object.fromEntries(
        rules.map(rule => {
          const optionsPath = join(domainDir, rule, "options.json");
          const config = existsSync(optionsPath) ? JSON.parse(readFileSync(optionsPath, "utf8")) : "error";
          return [`${module.meta.name}/${rule}`, config];
        })
      ),
    })
  );

  const proc = Bun.spawnSync([oxlint, "-c", configPath, "--format", "json", domainDir]);
  const stdout = proc.stdout.toString();
  rmSync(configPath, { force: true });

  let diagnostics: { filename?: string; code?: string }[] = [];
  try {
    diagnostics = JSON.parse(stdout).diagnostics ?? [];
  } catch {
    failures.push(
      `${dirName}: could not parse oxlint output: ${stdout.slice(0, 400)} ${proc.stderr.toString().slice(0, 400)}`
    );
    continue;
  }

  for (const rule of rules) {
    const hits = (file: string) =>
      diagnostics.filter(
        d =>
          d.filename?.includes(`fixtures/${dirName}/${rule}/`) &&
          d.filename?.includes(`/${file}.`) &&
          (d.code?.includes(`${module.meta.name}(${rule})`) || d.code?.includes(`${module.meta.name}/${rule}`))
      ).length;
    if (hits("bad") === 0) failures.push(`${dirName}/${rule}: bad fixture did not fire`);
    if (hits("good") > 0) failures.push(`${dirName}/${rule}: good fixture fired`);
  }
}

// every module must have a fixture dir at all
for (const module of allModules) {
  if (!fixtureDirs.includes(shortName(module))) failures.push(`${shortName(module)}: module has no fixtures dir`);
}

if (failures.length > 0) {
  console.error(`FIXTURE FAILURES (${failures.length}):\n` + failures.map(f => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`fixtures ok: ${fixtureDirs.length} modules checked`);
