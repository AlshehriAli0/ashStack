import { join } from "node:path";

const root = join(import.meta.dir, "..");
const smokeDir = join(root, "examples", "smoke");
const oxlint = join(root, "node_modules", ".bin", "oxlint");

const RULES_PROVING_THE_PIPELINE = {
  builtInFromCore: "eqeqeq",
  correctnessCategory: "no-var",
  reactPluginFromEntry: "jsx-key",
  typeAwareBackend: "no-floating-promises",
  moduleDetectedFromDependency: "@ashstack/zod/prefer-enum",
  importBanFromModule: "no-restricted-imports",
  optInRuleWithOptions: "@ashstack/core/use-design-system",
};

const ONE_RULE_PER_DETECTED_MODULE = [
  "@ashstack/unistyles/no-hardcoded-color",
  "@ashstack/legend-state/naming",
  "@ashstack/legend-list/no-remount-key",
  "@ashstack/reanimated/no-shared-value-dot-value",
  "@ashstack/react-native/no-leaked-render",
  "@ashstack/query/no-inline-keys",
  "@ashstack/i18n/no-bare-text",
];

const RULES_THE_CONSUMER_TURNED_OFF = ["no-nested-ternary", "@ashstack/unistyles/no-margin"];

const DESIGN_SYSTEM_DIR = "components/ui/";
const DESIGN_SYSTEM_RULE = "use-design-system";

const lint = Bun.spawnSync([oxlint, "--type-aware", "--format", "json", "."], { cwd: smokeDir });

let diagnostics: { filename?: string; code?: string }[] = [];
try {
  diagnostics = JSON.parse(lint.stdout.toString()).diagnostics ?? [];
} catch {
  const output = lint.stdout.toString().slice(0, 1000);
  const error = lint.stderr.toString().slice(0, 1000);
  console.error(`could not parse oxlint output:\n${output}\n${error}`);
  process.exit(1);
}

const codes = diagnostics.map(d => `${d.filename}::${d.code}`).join("\n");
const failures: string[] = [];

const asOxlintPrintsIt = (ruleId: string) => ruleId.replace(/\/([^/]+)$/, "($1)");
const fired = (ruleId: string) => codes.includes(ruleId) || codes.includes(asOxlintPrintsIt(ruleId));

for (const ruleId of [...Object.values(RULES_PROVING_THE_PIPELINE), ...ONE_RULE_PER_DETECTED_MODULE]) {
  if (!fired(ruleId)) failures.push(`expected rule to fire: ${ruleId}`);
}

for (const ruleId of RULES_THE_CONSUMER_TURNED_OFF) {
  if (fired(ruleId)) failures.push(`consumer override failed: ${ruleId} fired despite being turned off`);
}

const firedInsideDesignSystem = diagnostics.some(
  d => d.filename?.includes(DESIGN_SYSTEM_DIR) && d.code?.includes(DESIGN_SYSTEM_RULE)
);
if (firedInsideDesignSystem) {
  failures.push(`design-system exemption failed: ${DESIGN_SYSTEM_RULE} fired inside ${DESIGN_SYSTEM_DIR}`);
}

const probeDetection = Bun.spawnSync(
  [
    "bun",
    "-e",
    `const { reactNative } = await import("@ashstack/lint");
     const rules = Object.keys(reactNative({ zustand: false }).rules);
     console.log(JSON.stringify({
       dependencyEnablesModule: rules.some(r => r.startsWith("@ashstack/zod/")),
       missingDependencyDisablesModule: !rules.some(r => r.includes("turbo-image")),
       falseOverridesDependency: !rules.some(r => r.startsWith("@ashstack/zustand/")),
     }));`,
  ],
  { cwd: smokeDir }
);

try {
  const detection: Record<string, boolean> = JSON.parse(probeDetection.stdout.toString());
  for (const [expectation, held] of Object.entries(detection)) {
    if (!held) failures.push(`detection failed: ${expectation}`);
  }
} catch {
  failures.push(`detection probe failed: ${probeDetection.stderr.toString().slice(0, 300)}`);
}

if (failures.length > 0) {
  const listed = failures.map(f => `  - ${f}`).join("\n");
  console.error(`SMOKE FAILURES:\n${listed}\n\nDiagnostics seen:\n${codes}`);
  process.exit(1);
}
console.log(`smoke ok: ${diagnostics.length} diagnostics, pipeline verified`);
