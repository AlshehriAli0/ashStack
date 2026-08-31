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
expectFired("prefer-zod-enum"); // custom js-plugin rule loaded via npm self-reference

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
