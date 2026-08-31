// Fixture gate: for every packages/lint/fixtures/<domain>/<rule>/, bad.* must fire
// <domain>/<rule> at least once and good.* must never fire it.
import { existsSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const lintDir = join(import.meta.dir, "..", "packages", "lint");
const fixturesDir = join(lintDir, "fixtures");
const oxlint = join(import.meta.dir, "..", "node_modules", ".bin", "oxlint");

const failures: string[] = [];

const domains = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const domain of domains) {
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
      jsPlugins: [`./plugins/${domain}.js`],
      rules: Object.fromEntries(
        rules.map(rule => {
          // a rule dir may carry options.json when the rule needs configuration to fire
          const optionsPath = join(domainDir, rule, "options.json");
          const config = existsSync(optionsPath) ? JSON.parse(readFileSync(optionsPath, "utf8")) : "error";
          return [`${domain}/${rule}`, config];
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
          (d.code?.includes(`${domain}(${rule})`) || d.code?.includes(`${domain}/${rule}`))
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
