import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const die = (reason: string): never => {
  console.error(`PACK FAILURES:\n  - ${reason}`);
  rmSync(workspace, { recursive: true, force: true });
  process.exit(1);
};

/** The tarball npm just wrote, named from the package's own version rather than a version pinned here. */
const tarballs: Record<string, string> = {};
for (const pkg of ["lint", "fmt"]) {
  const dir = join(repoRoot, "packages", pkg);
  // what: a global .npmrc may set ignore-scripts, which silently skips the prepack that builds dist
  const packed = run(["npm", "pack", "--ignore-scripts=false", "--pack-destination", workspace], dir);
  if (!packed.ok) die(`npm pack failed for @ashstack/${pkg}: ${packed.err.slice(0, 300)}`);
  const { version } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  tarballs[pkg] = join(workspace, `ashstack-${pkg}-${version}.tgz`);
}

mkdirSync(join(consumer, "src"), { recursive: true });
writeFileSync(
  join(consumer, "package.json"),
  JSON.stringify({
    name: "pack-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@ashstack/lint": `file:${tarballs.lint}`,
      "@ashstack/fmt": `file:${tarballs.fmt}`,
      oxfmt: "0.65.0",
      oxlint: "1.80.0",
      zod: "^4.1.5",
    },
  })
);
writeFileSync(
  join(consumer, "oxlint.config.mts"),
  `import { reactNative } from "@ashstack/lint/react-native";\nimport { defineConfig } from "oxlint";\nexport default defineConfig({ extends: [reactNative()] });\n`
);
writeFileSync(join(consumer, "oxfmt.config.mts"), `import fmt from "@ashstack/fmt";\nexport default fmt;\n`);
writeFileSync(
  join(consumer, "src/a.ts"),
  `import { z } from "zod";\nenum K {\n  A,\n}\nexport const s = z.nativeEnum(K);\n`
);

const installed = run(["bun", "install", "--no-save"], consumer);
if (!installed.ok) die(`installing the tarballs failed: ${installed.err.slice(0, 400)}`);

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

/** Reads every entry, both import styles and each options type, so a public type the prune dropped fails here. */
const EVERY_PUBLIC_TYPE = [
  'import defaultCore from "@ashstack/lint/core";',
  'import { core, type CoreOptions, type CoreRuleId } from "@ashstack/lint/core";',
  'import { react, type ReactOptions, type ReactRuleId } from "@ashstack/lint/react";',
  'import { banGroups, reactNative } from "@ashstack/lint/react-native";',
  'import type { ModuleManifest, ReactNativeOptions, ReactNativeRuleId } from "@ashstack/lint/react-native";',
  'import { defineConfig } from "oxlint";',
  "",
  "const coreOptions: CoreOptions = { zod: true };",
  "const reactOptions: ReactOptions = { tailwind: true };",
  "const nativeOptions: ReactNativeOptions = { unistyles: true };",
  "const modules: ModuleManifest[] = [];",
  'const ids: [CoreRuleId, ReactRuleId, ReactNativeRuleId] = ["@ashstack/core/no-comments", "@ashstack/query/no-inline-keys", "@ashstack/unistyles/no-margin"];',
  "export const built = [core(coreOptions), react(reactOptions), reactNative(nativeOptions), defaultCore()];",
  "export const counts = [built.length, modules.length, banGroups.length, ids.length];",
  "export const config = defineConfig({",
  "  extends: [reactNative(nativeOptions)],",
  "  rules: {",
  '    "@ashstack/core/no-comments": ["error", { jsdoc: "allow", budget: 1 }],',
  '    "@ashstack/unistyles/no-margin": "off",',
  "  },",
  "});",
].join("\n");

/** A wrong rule option has to be a type error, or the hover types the augmentation ships are decoration. */
const BOGUS_RULE_OPTION = [
  'import { core } from "@ashstack/lint/core";',
  'import { defineConfig } from "oxlint";',
  "",
  "export default defineConfig({",
  "  extends: [core()],",
  '  rules: { "@ashstack/core/no-comments": ["error", { jsdoc: "sometimes" }] },',
  "});",
].join("\n");

const COMPILER_OPTIONS = {
  module: "nodenext",
  moduleResolution: "nodenext",
  target: "es2022",
  strict: true,
  noEmit: true,
};

// why: the consumer installs no typescript of its own
const TSC = join(repoRoot, "node_modules", ".bin", "tsc");

/** Whether the declarations `prune-types.ts` kept are enough for a consumer to compile `source`. */
const typecheckConsumer = (file: string, source: string): { ok: boolean; out: string; err: string } => {
  writeFileSync(join(consumer, file), source);
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify({ compilerOptions: COMPILER_OPTIONS, include: [file] })
  );
  return run([TSC, "-p", "tsconfig.json"], consumer);
};

const typechecked = typecheckConsumer("types.ts", EVERY_PUBLIC_TYPE);
if (!typechecked.ok) {
  failures.push(`the packed types did not satisfy a consumer: ${(typechecked.out + typechecked.err).slice(0, 500)}`);
}

const rejected = typecheckConsumer("bogus.ts", BOGUS_RULE_OPTION);
if (rejected.ok) {
  failures.push("a bogus rule option typechecked: the packed rule-option types are not reaching the consumer");
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
console.log("pack ok: both tarballs install, typecheck and work in a clean consumer");
