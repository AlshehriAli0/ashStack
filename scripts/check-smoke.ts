// Smoke gate: lint examples/smoke exactly as a consumer would (oxlint.config.mts
// extending @ashstack/lint/react-native) and assert the pipeline works end to end:
// built-in rules, custom js-plugin rules, and consumer overrides.
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const smokeDir = join(root, "examples", "smoke");
const oxlint = join(root, "node_modules", ".bin", "oxlint");

const proc = Bun.spawnSync([oxlint, "--type-aware", "--format", "json", "."], { cwd: smokeDir });
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

// oxlint prints custom-rule codes as "<plugin>(<rule>)"; accept either form
const parenForm = (id: string) => id.replace(/\/([^/]+)$/, "($1)");
const expectFired = (id: string) => {
  if (!codes.includes(id) && !codes.includes(parenForm(id))) failures.push(`expected rule to fire: ${id}`);
};

expectFired("eqeqeq"); // built-in eslint rule from core
expectFired("no-var"); // categories/correctness pipeline
expectFired("jsx-key"); // react plugin propagated through the entry
expectFired("no-floating-promises"); // type-aware pipeline (oxlint-tsgolint) works through the entry
expectFired("@ashstack/zod/prefer-enum"); // module auto-detected from the smoke package's zod dep
// modules auto-detected from the smoke package's deps, one custom rule each
expectFired("@ashstack/unistyles/no-hardcoded-color");
expectFired("@ashstack/legend-state/naming");
expectFired("@ashstack/legend-list/no-remount-key");
expectFired("@ashstack/reanimated/no-shared-value-dot-value");
expectFired("@ashstack/react-native/no-leaked-render");
expectFired("@ashstack/query/no-inline-keys");
expectFired("@ashstack/i18n/no-bare-text");
expectFired("no-restricted-imports"); // FlatList ban ships with the legend-list module
expectFired("@ashstack/core/use-design-system"); // opt-in rule configured with a `use` map

// the design-system dir is exempt from its own rule (it wraps the raw primitives)
if (diagnostics.some(d => d.filename?.includes("components/ui/") && d.code?.includes("use-design-system"))) {
  failures.push("design-system exemption failed: use-design-system fired inside components/ui/");
}

// consumer per-rule override of a custom rule must win
const noMargin = "@ashstack/unistyles/no-margin";
if (codes.includes(noMargin) || codes.includes(parenForm(noMargin))) {
  failures.push(`consumer override failed: ${noMargin} fired despite being turned off`);
}

// detection: zod dep auto-on (asserted above); zustand dep FORCED off; turbo-image auto-off (no dep)
const detection = Bun.spawnSync(
  [
    "bun",
    "-e",
    `const { reactNative } = await import("@ashstack/lint");
     const rules = Object.keys(reactNative({ zustand: false }).rules);
     console.log(JSON.stringify({
       zod: rules.some(r => r.startsWith("@ashstack/zod/")),
       turbo: rules.some(r => r.includes("turbo-image")),
       zustand: rules.some(r => r.startsWith("@ashstack/zustand/")),
     }));`,
  ],
  { cwd: smokeDir }
);
try {
  const { zod, turbo, zustand } = JSON.parse(detection.stdout.toString());
  if (!zod) failures.push("detection failed: zod/ rules missing despite zod dependency");
  if (turbo) failures.push("detection failed: turbo-image rules present without the dependency");
  if (zustand) failures.push("force-off failed: zustand rules present despite zustand: false");
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
