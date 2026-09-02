import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Drop the `.d.ts` files no consumer can reach.
 *
 * `tsc` emits one declaration per source file, so a rule's types ship even
 * though the entries type every rule opaquely as `ModuleManifest` and nothing
 * outside the package can import a rule's path. Walking out from the entries
 * named in `exports` leaves four files; the other hundred-odd are 20 KB that
 * only ever get downloaded.
 *
 * A declaration bundler would do this by inlining instead, which is a build
 * step that can rewrite types. Deleting what is already unreachable cannot.
 */
const lintDir = join(import.meta.dir, "..", "packages", "lint");
const distDir = join(lintDir, "dist");

/** Both spellings a declaration uses to name another file: `from "x"` and the inline `import("x")`. */
const REFERENCE = /(?:from\s*|import\s*\()\s*"([^"]+)"/g;

const declarationsUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return declarationsUnder(path);
    return entry.name.endsWith(".d.ts") ? [path] : [];
  });

/** The `types` file of every subpath in `exports`, which is every entry a consumer can import. */
const entryDeclarations = (): string[] => {
  const manifest: unknown = JSON.parse(readFileSync(join(lintDir, "package.json"), "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("exports" in manifest)) return [];
  const { exports } = manifest;
  if (typeof exports !== "object" || exports === null) return [];
  return Object.values(exports).flatMap(target => {
    if (typeof target !== "object" || target === null || !("types" in target)) return [];
    return typeof target.types === "string" ? [resolve(lintDir, target.types)] : [];
  });
};

const reachableFrom = (roots: string[]): Set<string> => {
  const seen = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || seen.has(path)) continue;
    try {
      statSync(path);
    } catch {
      continue;
    }
    seen.add(path);
    const text = readFileSync(path, "utf8");
    for (const [, specifier = ""] of text.matchAll(REFERENCE)) {
      if (!specifier.startsWith(".")) continue;
      pending.push(resolve(dirname(path), specifier.replace(/\.js$/, ".d.ts")));
    }
  }
  return seen;
};

const roots = entryDeclarations();
if (roots.length === 0) throw new Error("no `exports` entry named a types file - nothing to walk out from");

const reachable = reachableFrom(roots);
let removed = 0;
let bytes = 0;

for (const path of declarationsUnder(distDir)) {
  if (reachable.has(path)) continue;
  bytes += statSync(path).size;
  rmSync(path);
  removed += 1;
}

const kept = [...reachable].map(path => relative(distDir, path)).sort();
console.log(`pruned ${removed} unreachable .d.ts (${(bytes / 1024).toFixed(1)} KB), kept ${kept.join(", ")}`);
