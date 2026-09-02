import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Vendor the effect plugin, keeping its rules and dropping its config presets.
 *
 * oxlint reads `plugin.rules`. The presets exist for ESLint's flat and legacy
 * configs, and they are the only reason the file imports `globals` — a 264 KB
 * dependency for four objects nothing here reads. Stripping them leaves the
 * rules with no imports at all.
 *
 * Run it against an unpacked release:
 *
 *     npm pack eslint-plugin-react-you-might-not-need-an-effect@<version>
 *     tar xzf eslint-plugin-*.tgz
 *     bun scripts/vendor-effects.ts --from=package/dist/index.mjs
 */
const outPath = join(import.meta.dir, "..", "packages", "lint", "vendor", "react-effect", "index.mjs");

const argument = (flag: string): string | undefined =>
  process.argv.find(value => value.startsWith(`${flag}=`))?.slice(flag.length + 1);

const from = argument("--from");
if (from === undefined) throw new Error("pass --from=<path to the release's dist/index.mjs>");

const GLOBALS_IMPORT = 'import globals from "globals";\n';
const PRESETS_START = "const rules = (severity) =>";

const source = readFileSync(from, "utf8");
if (!source.includes(GLOBALS_IMPORT)) throw new Error("no `globals` import found - has the release changed shape?");
if (!source.includes(PRESETS_START)) throw new Error("no preset block found - has the release changed shape?");

const withoutPresets = source.slice(0, source.indexOf(PRESETS_START));
const vendored = `${withoutPresets.replace(GLOBALS_IMPORT, "")}export { plugin as default };\n`;

const leftover = [...vendored.matchAll(/(?:^|\n)import\s[^\n]*?from\s*"([^"]+)"/g)].map(match => match[1]);
if (leftover.length > 0) throw new Error(`the vendored file still imports ${leftover.join(", ")}`);

writeFileSync(outPath, vendored);
console.log(`wrote ${outPath} (${(vendored.length / 1024).toFixed(1)} KB, no imports)`);
