// Smoke gate: lint examples/smoke exactly as a consumer would (oxlint.config.mts
// extending @ashstack/lint/react-native) and assert the pipeline works end to end:
// built-in rules, custom js-plugin rules, and consumer overrides.
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const smokeDir = join(root, "examples", "smoke");
const oxlint = join(root, "node_modules", ".bin", "oxlint");

const proc = Bun.spawnSync([oxlint, "--format", "json", "."], { cwd: smokeDir });
const out = proc.stdout.toString();
const diagnostics: { filename?: string; code?: string }[] = (() => {
  try {
    return JSON.parse(out).diagnostics ?? [];
  } catch {
    console.error(`could not parse oxlint output:\n${out.slice(0, 1000)}\n${proc.stderr.toString().slice(0, 1000)}`);
    process.exit(1);
  }
})();

const codes = diagnostics.map(d => `${d.filename}::${d.code}`).join("\n");
const failures: string[] = [];

const expectFired = (fragment: string) => {
  if (!codes.includes(fragment)) failures.push(`expected rule to fire: ${fragment}`);
};

expectFired("eqeqeq"); // built-in eslint rule from core
expectFired("no-var"); // categories/correctness pipeline
expectFired("jsx-key"); // react plugin propagated through the entry
expectFired("prefer-enum"); // zod/ group auto-detected from the smoke package's zod dep

// detection: zod is a smoke dep (group on), turbo-image is not (group absent)
const detection = Bun.spawnSync(
  [
    "bun",
    "-e",
    `const { reactNative } = await import("@ashstack/lint");
     const rules = Object.keys(reactNative().rules);
     console.log(JSON.stringify({ zod: rules.some(r => r.startsWith("@ashstack/zod/")), turbo: rules.some(r => r.includes("turbo-image")) }));`,
  ],
  { cwd: smokeDir }
);
try {
  const { zod, turbo } = JSON.parse(detection.stdout.toString());
  if (!zod) failures.push("detection failed: zod/ rules missing despite zod dependency");
  if (turbo) failures.push("detection failed: turbo-image rules present without the dependency");
} catch {
  failures.push(`detection probe failed: ${detection.stderr.toString().slice(0, 300)}`);
}

// consumer override must win
if (diagnostics.some(d => d.filename?.includes("overridden.ts") && d.code?.includes("no-nested-ternary"))) {
  failures.push("consumer override failed: no-nested-ternary fired despite being turned off");
}

if (failures.length > 0) {
  console.error("SMOKE FAILURES:\n" + failures.map(f => `  - ${f}`).join("\n"));
  console.error("\nDiagnostics seen:\n" + codes);
  process.exit(1);
}
console.log(`smoke ok: ${diagnostics.length} diagnostics, pipeline verified`);
