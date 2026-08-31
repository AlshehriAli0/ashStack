// Library detection: a rule group ships enabled only when the consumer actually
// depends on that library. Reads every package.json from cwd up to the nearest
// repo boundary (a directory containing .git), so monorepos work — the app
// package, the workspace root, or both. Cached per starting directory.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const depsAt = (dir: string): string[] => {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  } catch {
    return [];
  }
};

const caches = new Map<string, Set<string>>();

const allDeps = (): Set<string> => {
  const start = process.cwd();
  const cached = caches.get(start);
  if (cached) return cached;

  const deps = new Set<string>();
  let dir = start;
  for (;;) {
    for (const name of depsAt(dir)) deps.add(name);
    // stop at the repo boundary so a stray ~/package.json can't enable rules
    if (existsSync(join(dir, ".git"))) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  caches.set(start, deps);
  return deps;
};

/** explicit option wins; otherwise on iff one of the packages is a dependency */
export const detect = (option: boolean | undefined, packages: string[] | undefined): boolean =>
  option ?? (packages === undefined || packages.some(name => allDeps().has(name)));
