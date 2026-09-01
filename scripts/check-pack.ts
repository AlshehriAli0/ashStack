import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const workspace = mkdtempSync(join(tmpdir(), "ashstack-pack-"));
const consumer = join(workspace, "consumer");

const run = (command: string[], cwd: string) => {
  const result = Bun.spawnSync(command, { cwd });
  return { ok: result.exitCode === 0, out: result.stdout.toString(), err: result.stderr.toString() };
};

const failures: string[] = [];

for (const pkg of ["lint", "fmt"]) {
  const packed = run(["npm", "pack", "--pack-destination", workspace], join(repoRoot, "packages", pkg));
  if (!packed.ok) failures.push(`npm pack failed for @ashstack/${pkg}: ${packed.err.slice(0, 300)}`);
}

mkdirSync(join(consumer, "src"), { recursive: true });
writeFileSync(
  join(consumer, "package.json"),
  JSON.stringify({
    name: "pack-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@ashstack/lint": `file:${join(workspace, "ashstack-lint-0.0.0.tgz")}`,
      "@ashstack/fmt": `file:${join(workspace, "ashstack-fmt-0.0.0.tgz")}`,
      oxfmt: "0.65.0",
      oxlint: "1.80.0",
      zod: "^4.1.5",
    },
  })
);
writeFileSync(
  join(consumer, "oxlint.config.mts"),
  `import { reactNative } from "@ashstack/lint";\nimport { defineConfig } from "oxlint";\nexport default defineConfig({ extends: [reactNative()] });\n`
);
writeFileSync(join(consumer, "oxfmt.config.mts"), `import fmt from "@ashstack/fmt";\nexport default fmt;\n`);
writeFileSync(
  join(consumer, "src/a.ts"),
  `import { z } from "zod";\nenum K {\n  A,\n}\nexport const s = z.nativeEnum(K);\n`
);

const installed = run(["bun", "install", "--no-save"], consumer);
if (!installed.ok) failures.push(`installing the tarballs failed: ${installed.err.slice(0, 400)}`);

const oxlint = join(consumer, "node_modules", ".bin", "oxlint");
const linted = run([oxlint, "--format", "json", "src/a.ts"], consumer);
const codes: string[] = (() => {
  try {
    return (JSON.parse(linted.out).diagnostics ?? []).map((d: { code?: string }) => d.code ?? "");
  } catch {
    failures.push(`the packed config did not produce lint output: ${linted.err.slice(0, 400)}`);
    return [];
  }
})();
if (!codes.some(code => code.includes("@ashstack/zod"))) {
  failures.push(`a module rule did not fire from the packed package; saw: ${codes.join(", ") || "nothing"}`);
}

const formatted = run([join(consumer, "node_modules", ".bin", "oxfmt"), "--check", "src/a.ts"], consumer);
if (!formatted.ok && !formatted.out.includes("Format issues")) {
  failures.push(`the packed oxfmt config did not load: ${formatted.err.slice(0, 300)}`);
}

rmSync(workspace, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`PACK FAILURES:\n${failures.map(f => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("pack ok: both tarballs install and work in a clean consumer");
