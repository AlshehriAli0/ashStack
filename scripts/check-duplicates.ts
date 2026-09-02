import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { coreModules, reactModules, reactNative, reactNativeModules } from "../packages/lint/dist/index.js";
import type { ModuleManifest } from "../packages/lint/dist/lib/types.js";

/**
 * Fail when two rules report the same defect at the same place.
 *
 * Every rule this package ships has a fixture, and the vendored effect rules
 * have `tests/corpus/`, so linting both with every module on shows which rules
 * land on the same line and column. Pairs in `tests/duplicate-rules.json` were
 * read and judged to be separate complaints; anything else is one defect
 * reported twice, which is noise a consumer has to dismiss twice.
 */
const repoRoot = join(import.meta.dir, "..");
const fixturesDir = join(repoRoot, "packages", "lint", "fixtures");
const corpusDir = join(repoRoot, "tests", "corpus");
const allowPath = join(repoRoot, "tests", "duplicate-rules.json");
const OXLINT = join(repoRoot, "node_modules", ".bin", "oxlint");

interface Span {
  line: number;
  column: number;
}

interface Diagnostic {
  code: string;
  filename: string;
  labels?: { span: Span }[];
}

const everyModuleOn = (modules: ModuleManifest[]): Record<string, boolean> =>
  Object.fromEntries(modules.flatMap(m => (m.option === undefined ? [] : [[m.option, true]])));

/** Every fixture, named so a diagnostic points back at the rule it belongs to. */
const fixtureFiles = (): [name: string, path: string][] =>
  readdirSync(fixturesDir).flatMap(moduleName =>
    readdirSync(join(fixturesDir, moduleName)).flatMap(rule =>
      ["bad", "good"]
        .map(kind => [`${moduleName}__${rule}__${kind}.tsx`, join(fixturesDir, moduleName, rule, `${kind}.tsx`)])
        .filter((pair): pair is [string, string] => existsSync(pair[1] ?? ""))
    )
  );

/** The rules with no fixtures of their own, which is the vendored effect plugin. */
const corpusFiles = (): [name: string, path: string][] =>
  readdirSync(corpusDir)
    .filter(file => file.endsWith(".tsx"))
    .map(file => [`corpus__${file}`, join(corpusDir, file)]);

const files = [...fixtureFiles(), ...corpusFiles()];
const workspace = mkdtempSync(join(tmpdir(), "ashstack-duplicates-"));
mkdirSync(join(workspace, "src"), { recursive: true });
for (const [name, path] of files) cpSync(path, join(workspace, "src", name));

const config = reactNative(everyModuleOn([...coreModules, ...reactModules, ...reactNativeModules]));
writeFileSync(join(workspace, "oxlint.config.json"), JSON.stringify({ ...config, ignorePatterns: [] }));

const run = Bun.spawnSync([OXLINT, "-c", "oxlint.config.json", "--disable-nested-config", "--format", "json", "src"], {
  cwd: workspace,
});
const stdout = run.stdout.toString();
rmSync(workspace, { recursive: true, force: true });

let diagnostics: Diagnostic[] = [];
try {
  diagnostics = JSON.parse(stdout).diagnostics ?? [];
} catch {
  console.error(`oxlint produced no JSON:\n${stdout.slice(0, 1000)}\n${run.stderr.toString().slice(0, 1000)}`);
  process.exit(1);
}

/**
 * The corpus is the only thing exercising rules that have no fixtures. If it
 * stops reaching them, this check quietly narrows instead of failing, so an
 * empty result is treated as breakage rather than success.
 */
const reached = new Set(diagnostics.map(diagnostic => diagnostic.code.replace(/\(.*$/, "")));
for (const plugin of ["@ashstack/effects", "@ashstack/core", "@ashstack/react"]) {
  if (!reached.has(plugin)) {
    console.error(
      `no ${plugin} diagnostics: the corpus or fixtures stopped reaching it, so this check proves nothing.`
    );
    process.exit(1);
  }
}

const codesAt = new Map<string, Set<string>>();
for (const diagnostic of diagnostics) {
  const span = diagnostic.labels?.[0]?.span;
  if (span === undefined) continue;
  const key = `${diagnostic.filename}:${span.line}:${span.column}`;
  codesAt.set(key, new Set([...(codesAt.get(key) ?? []), diagnostic.code]));
}

const pairsAt = (codes: Set<string>): string[] => {
  const sorted = [...codes].toSorted();
  return sorted.flatMap((left, index) => sorted.slice(index + 1).map(right => `${left} + ${right}`));
};

const allowed = new Set<string>(existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, "utf8")).separate : []);
const found = new Map<string, string>();
for (const [where, codes] of codesAt) {
  if (codes.size < 2) continue;
  for (const pair of pairsAt(codes)) if (!allowed.has(pair)) found.set(pair, where);
}

if (found.size > 0) {
  console.error("RULES REPORTING THE SAME PLACE:");
  for (const [pair, where] of found) console.error(`  - ${pair}\n      first seen at ${where}`);
  console.error(
    "\nTurn one of each pair off where it is redundant, or, if they are separate complaints, add the pair to tests/duplicate-rules.json."
  );
  process.exit(1);
}

console.log(
  `duplicates ok: ${files.length} files, ${diagnostics.length} diagnostics, ${allowed.size} pairs judged separate`
);
